import { Injectable, Logger } from '@nestjs/common';
import { MatchStatus, Prisma, Property, Requirement, Urgency } from '@prisma/client';
import { HOT_MATCH_THRESHOLD, MATCH_WEIGHTS } from '@ar-buildwel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadsService } from '../leads/leads.service';
import { MlClientService, type MatchMlFeatures } from './ml-client.service';
import { PropertySearchIndexService } from '../search/property-search-index.service';

export type MatchFactors = {
  location: number;
  budget: number;
  propertyType: number;
  dealType: number;
  areaSqft: number;
  urgency: number;
};

type ScoreBreakdown = {
  ruleScore: number;
  factors: MatchFactors;
  sub: {
    location0_100: number;
    budget0_100: number;
    typeMatch: 0 | 1;
    area0_100: number;
    urgency0_100: number;
  };
};

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly leads: LeadsService,
    private readonly mlClient: MlClientService,
    private readonly propertySearchIndex: PropertySearchIndexService,
  ) {}

  private scorePair(property: Property, req: Requirement): ScoreBreakdown {
    const loc =
      property.city.toLowerCase() === req.city.toLowerCase() &&
      req.areas.some(
        (a) =>
          property.areaPublic.toLowerCase().includes(a.toLowerCase()) ||
          property.localityPublic.toLowerCase().includes(a.toLowerCase()),
      )
        ? 100
        : property.city.toLowerCase() === req.city.toLowerCase()
          ? 60
          : 0;

    const price = Number(property.price);
    const bmin = Number(req.budgetMin);
    const bmax = Number(req.budgetMax);
    const budgetRaw =
      price >= bmin && price <= bmax
        ? 100
        : price < bmin
          ? Math.max(0, 100 - ((bmin - price) / bmin) * 100)
          : Math.max(0, 100 - ((price - bmax) / bmax) * 50);

    const typeMatch: 0 | 1 = property.propertyType === req.propertyType ? 1 : 0;
    const propertyType = typeMatch ? 100 : 0;
    const dealType = property.dealType === req.dealType ? 100 : 0;

    const sq =
      property.areaSqft >= req.areaSqftMin && property.areaSqft <= req.areaSqftMax
        ? 100
        : 50;

    const urgencyRaw: number =
      req.urgency === Urgency.IMMEDIATE
        ? 100
        : req.urgency === Urgency.WITHIN_30_DAYS
          ? 70
          : 40;

    const factors: MatchFactors = {
      location: loc * MATCH_WEIGHTS.location,
      budget: budgetRaw * MATCH_WEIGHTS.budget,
      propertyType: propertyType * MATCH_WEIGHTS.propertyType,
      dealType: dealType * MATCH_WEIGHTS.dealType,
      areaSqft: sq * MATCH_WEIGHTS.areaSqft,
      urgency: urgencyRaw * MATCH_WEIGHTS.urgency,
    };

    const ruleScore = Math.min(
      100,
      Math.round(
        factors.location +
          factors.budget +
          factors.propertyType +
          factors.dealType +
          factors.areaSqft +
          factors.urgency,
      ),
    );

    return {
      ruleScore,
      factors,
      sub: {
        location0_100: loc,
        budget0_100: budgetRaw,
        typeMatch,
        area0_100: sq,
        urgency0_100: urgencyRaw,
      },
    };
  }

  private buildMlFeatures(
    property: Property,
    req: Requirement,
    sub: ScoreBreakdown['sub'],
  ): MatchMlFeatures {
    const reqMid = (req.areaSqftMin + req.areaSqftMax) / 2;
    const pa = property.areaSqft;
    const area_ratio =
      pa > 0 && reqMid > 0 ? Math.min(pa, reqMid) / Math.max(pa, reqMid) : 0.5;

    const ms = Date.now() - new Date(property.createdAt).getTime();
    const days_since_listing = Math.max(0, Math.floor(ms / 86_400_000));

    return {
      location_match: sub.location0_100 / 100,
      budget_overlap: sub.budget0_100 / 100,
      type_match: sub.typeMatch,
      area_ratio,
      urgency_delta: sub.urgency0_100 / 100,
      broker_conversion_rate: 0.5,
      days_since_listing,
      requirement_hot: req.urgency === Urgency.IMMEDIATE || req.tag === 'HOT',
    };
  }

  async runForProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) return;
    const reqs = await this.prisma.requirement.findMany({
      where: { active: true },
    });
    for (const req of reqs) {
      await this.upsertMatch(property, req);
    }
    await this.redis.setJson(
      `match:property:${propertyId}`,
      { updatedAt: new Date().toISOString() },
      300,
    );
  }

  async runForRequirement(requirementId: string) {
    const req = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
    });
    if (!req) return;
    const props = await this.prisma.property.findMany({
      where: { status: 'active' },
    });
    for (const property of props) {
      await this.upsertMatch(property, req);
    }
    await this.redis.setJson(
      `match:requirement:${requirementId}`,
      { updatedAt: new Date().toISOString() },
      300,
    );
  }

  private async upsertMatch(property: Property, req: Requirement) {
    const { ruleScore, factors, sub } = this.scorePair(property, req);
    if (ruleScore < 30) return;

    const features = this.buildMlFeatures(property, req, sub);
    let mlScore = ruleScore;
    let combinedScore = ruleScore;
    let mlConfidence = 0;
    let mlExplanation: Record<string, unknown> = {};

    try {
      const ml = await this.mlClient.scoreMatch({
        propertyId: property.id,
        requirementId: req.id,
        ruleScore,
        features,
      });
      mlScore = ml.mlScore;
      combinedScore = ml.combinedScore;
      mlConfidence = ml.confidence;
      mlExplanation = ml.explanation;
    } catch (e) {
      this.logger.warn(`ML scoring failed, using rule score: ${e}`);
    }

    const hotMatch = combinedScore >= HOT_MATCH_THRESHOLD;

    const matchFactorsStored = { ...(factors as Record<string, number>), ruleScore };

    const match = await this.prisma.match.upsert({
      where: {
        propertyId_requirementId: {
          propertyId: property.id,
          requirementId: req.id,
        },
      },
      create: {
        propertyId: property.id,
        requirementId: req.id,
        matchScore: combinedScore,
        matchFactors: matchFactorsStored as object,
        hotMatch,
        mlScore,
        combinedScore,
        mlConfidence,
        mlExplanation: mlExplanation as Prisma.InputJsonValue,
      },
      update: {
        matchScore: combinedScore,
        matchFactors: matchFactorsStored as object,
        hotMatch,
        mlScore,
        combinedScore,
        mlConfidence,
        mlExplanation: mlExplanation as Prisma.InputJsonValue,
      },
    });

    try {
      await this.leads.createFromMatchIfBroker(property, req, combinedScore);
    } catch {
      // Non-blocking side-effect: matching should still persist even if lead sync fails.
    }
    try {
      await this.notifications.notifyMatch(property, req, combinedScore, hotMatch);
    } catch {
      // Non-blocking side-effect: matching should still persist even if notification fails.
    }
    try {
      await this.propertySearchIndex.refreshMatchCount(property.id);
    } catch {
      // Non-blocking search index refresh
    }

    return match;
  }

  async listForProperty(propertyId: string) {
    return this.prisma.match.findMany({
      where: { propertyId },
      orderBy: { matchScore: 'desc' },
      include: {
        requirement: {
          select: {
            id: true,
            city: true,
            tag: true,
            budgetMin: true,
            budgetMax: true,
          },
        },
      },
    });
  }

  async listForRequirement(requirementId: string) {
    return this.prisma.match.findMany({
      where: { requirementId },
      orderBy: { matchScore: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            areaPublic: true,
            localityPublic: true,
            price: true,
            propertyType: true,
            dealType: true,
            trustScore: true,
          },
        },
      },
    });
  }

  /** Matches where the user owns the listing or the requirement */
  async listForUser(userId: string) {
    return this.prisma.match.findMany({
      where: {
        OR: [{ property: { postedById: userId } }, { requirement: { userId } }],
      },
      orderBy: { matchScore: 'desc' },
      take: 200,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            areaPublic: true,
            localityPublic: true,
            price: true,
            postedById: true,
            propertyType: true,
            dealType: true,
            trustScore: true,
          },
        },
        requirement: {
          select: {
            id: true,
            city: true,
            tag: true,
            budgetMin: true,
            budgetMax: true,
            userId: true,
            urgency: true,
          },
        },
      },
    });
  }

  async updateStatus(
    userId: string,
    matchId: string,
    status: MatchStatus,
    opts?: { accepted?: boolean },
  ) {
    const row = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        property: { select: { postedById: true } },
        requirement: { select: { userId: true } },
      },
    });
    if (!row) return null;
    if (row.property.postedById !== userId && row.requirement.userId !== userId)
      return null;

    const updatePayload: Prisma.MatchUpdateInput = { status };

    if (status === MatchStatus.REJECTED) {
      updatePayload.accepted = false;
      updatePayload.feedbackGiven = true;
    } else if (opts?.accepted !== undefined) {
      updatePayload.accepted = opts.accepted;
      if (opts.accepted) {
        updatePayload.convertedToLead = true;
        updatePayload.feedbackGiven = true;
      }
    }

    const updated = await this.prisma.match.update({
      where: { id: matchId },
      data: updatePayload,
    });

    if (status === MatchStatus.REJECTED) {
      this.mlClient.recordFeedback(matchId, { accepted: false });
    } else if (status === MatchStatus.ACCEPTED && opts?.accepted === true) {
      this.mlClient.recordFeedback(matchId, {
        accepted: true,
        convertedToLead: true,
      });
    }

    return updated;
  }

  async onDealReachedClosure(params: {
    propertyId: string | null;
    requirementId: string;
  }): Promise<void> {
    if (!params.propertyId) return;
    const m = await this.prisma.match.findUnique({
      where: {
        propertyId_requirementId: {
          propertyId: params.propertyId,
          requirementId: params.requirementId,
        },
      },
    });
    if (!m) return;
    await this.prisma.match.update({
      where: { id: m.id },
      data: { convertedToDeal: true, feedbackGiven: true },
    });
    this.mlClient.recordFeedback(m.id, {
      convertedToDeal: true,
      dealClosed: true,
    });
  }
}
