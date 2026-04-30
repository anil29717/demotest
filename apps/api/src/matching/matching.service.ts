import { Injectable, Logger } from '@nestjs/common';
import { MatchStatus, Prisma, Property, Requirement, Urgency } from '@prisma/client';
import { HOT_MATCH_THRESHOLD, MATCH_WEIGHTS } from '@ar-buildwel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
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

export type MatchRuleBreakdownRow = {
  key: string;
  label: string;
  rawScore: number;
  weight: number;
  contribution: number;
  /** Share of total rule score (sums ~100 across dimensions). */
  percentOfRuleScore: number;
};

type ScoreBreakdown = {
  ruleScore: number;
  factors: MatchFactors;
  sub: {
    location0_100: number;
    budget0_100: number;
    typeMatch: 0 | 1;
    propertyType0_100: number;
    dealType0_100: number;
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
    private readonly mlClient: MlClientService,
    private readonly propertySearchIndex: PropertySearchIndexService,
  ) {}

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private locationScore(property: Property, req: Requirement): number {
    const base =
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

    const reqLocation = (req as unknown as { location?: { lat?: number; lng?: number } | null }).location;
    const reqLat = reqLocation?.lat;
    const reqLng = reqLocation?.lng;
    if (typeof reqLat !== 'number' || typeof reqLng !== 'number') {
      return base;
    }
    const distanceKm = this.haversineKm(property.latitude, property.longitude, reqLat, reqLng);
    const distanceScore =
      distanceKm <= 2 ? 100 : distanceKm <= 5 ? 90 : distanceKm <= 10 ? 80 : distanceKm <= 20 ? 70 : 40;
    return Math.round((base + distanceScore) / 2);
  }

  /** Smooth penalty when sqft is outside the requirement band (not binary 50/100). */
  private areaScore(property: Property, req: Requirement): number {
    const pa = property.areaSqft;
    const min = req.areaSqftMin;
    const max = req.areaSqftMax;
    if (max <= min) return pa >= min ? 100 : 0;
    if (pa >= min && pa <= max) return 100;
    if (pa < min) {
      const span = min > 0 ? min : 1;
      const gap = min - pa;
      return Math.max(0, Math.round(100 - (gap / span) * 95));
    }
    const gap = pa - max;
    const span = max > 0 ? max : 1;
    return Math.max(0, Math.round(100 - (gap / span) * 75));
  }

  private buildRuleBreakdown(
    ruleScore: number,
    factors: MatchFactors,
    sub: ScoreBreakdown['sub'],
  ): MatchRuleBreakdownRow[] {
    const safe = Math.max(1, ruleScore);
    const rows: Array<{
      key: keyof MatchFactors;
      label: string;
      raw: number;
      w: number;
      contrib: number;
    }> = [
      {
        key: 'location',
        label: 'Location & proximity',
        raw: sub.location0_100,
        w: MATCH_WEIGHTS.location,
        contrib: factors.location,
      },
      {
        key: 'budget',
        label: 'Budget fit',
        raw: sub.budget0_100,
        w: MATCH_WEIGHTS.budget,
        contrib: factors.budget,
      },
      {
        key: 'propertyType',
        label: 'Property type',
        raw: sub.propertyType0_100,
        w: MATCH_WEIGHTS.propertyType,
        contrib: factors.propertyType,
      },
      {
        key: 'dealType',
        label: 'Deal type (sale/rent)',
        raw: sub.dealType0_100,
        w: MATCH_WEIGHTS.dealType,
        contrib: factors.dealType,
      },
      {
        key: 'areaSqft',
        label: 'Area (sq ft)',
        raw: sub.area0_100,
        w: MATCH_WEIGHTS.areaSqft,
        contrib: factors.areaSqft,
      },
      {
        key: 'urgency',
        label: 'Buyer urgency',
        raw: sub.urgency0_100,
        w: MATCH_WEIGHTS.urgency,
        contrib: factors.urgency,
      },
    ];
    return rows.map((r) => ({
      key: r.key,
      label: r.label,
      rawScore: Math.round(r.raw * 10) / 10,
      weight: r.w,
      contribution: Math.round(r.contrib * 10) / 10,
      percentOfRuleScore: Math.round((r.contrib / safe) * 1000) / 10,
    }));
  }

  private whySummaryLine(ruleScore: number, breakdown: MatchRuleBreakdownRow[]): string {
    const sorted = [...breakdown].sort((a, b) => b.contribution - a.contribution);
    const top = sorted.slice(0, 2);
    const parts = top.map((x) => `${x.label} (~${x.percentOfRuleScore}%)`);
    return `Rule score ${ruleScore}% is driven mainly by ${parts.join(' and ')}.`;
  }

  private scorePair(property: Property, req: Requirement): ScoreBreakdown {
    const loc = this.locationScore(property, req);

    const price = Number(property.price);
    const bmin = Number(req.budgetMin);
    const bmax = Number(req.budgetMax);
    const budgetRaw =
      price >= bmin && price <= bmax
        ? 100
        : price < bmin
          ? Math.max(0, 100 - ((bmin - price) / Math.max(bmin, 1)) * 100)
          : Math.max(0, 100 - ((price - bmax) / Math.max(bmax, 1)) * 55);

    const typeMatch: 0 | 1 = property.propertyType === req.propertyType ? 1 : 0;
    const propertyType0_100 = typeMatch ? 100 : 0;
    const dealType0_100 = property.dealType === req.dealType ? 100 : 0;

    const areaRaw = this.areaScore(property, req);

    const urgencyRaw: number =
      req.urgency === Urgency.IMMEDIATE
        ? 100
        : req.urgency === Urgency.WITHIN_30_DAYS
          ? 70
          : 40;

    const factors: MatchFactors = {
      location: loc * MATCH_WEIGHTS.location,
      budget: budgetRaw * MATCH_WEIGHTS.budget,
      propertyType: propertyType0_100 * MATCH_WEIGHTS.propertyType,
      dealType: dealType0_100 * MATCH_WEIGHTS.dealType,
      areaSqft: areaRaw * MATCH_WEIGHTS.areaSqft,
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
        propertyType0_100,
        dealType0_100,
        area0_100: areaRaw,
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

    const breakdown = this.buildRuleBreakdown(ruleScore, factors, sub);
    const matchFactorsStored = {
      ...(factors as Record<string, number>),
      ruleScore,
      sub,
      breakdown,
      summaryLine: this.whySummaryLine(ruleScore, breakdown),
      scoringVersion: 2,
    };

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
  async listForUser(
    userId: string,
    opts?: {
      heat?: 'all' | 'hot' | 'normal';
      minScore?: number;
      sort?: 'score' | 'price_asc' | 'price_desc';
    },
  ) {
    const extra: Prisma.MatchWhereInput[] = [];
    const heat = opts?.heat ?? 'all';
    if (heat === 'hot') {
      extra.push({ hotMatch: true });
    } else if (heat === 'normal') {
      extra.push({ hotMatch: false });
    }
    if (opts?.minScore != null && Number.isFinite(opts.minScore)) {
      extra.push({ matchScore: { gte: opts.minScore } });
    }

    let orderBy: Prisma.MatchOrderByWithRelationInput = {
      matchScore: 'desc',
    };
    if (opts?.sort === 'price_asc') {
      orderBy = { property: { price: 'asc' } };
    } else if (opts?.sort === 'price_desc') {
      orderBy = { property: { price: 'desc' } };
    }

    const orgRows = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = orgRows.map((r) => r.organizationId);
    const accessOr: Prisma.MatchWhereInput[] = [
      { property: { postedById: userId } },
      { requirement: { userId } },
    ];
    if (orgIds.length > 0) {
      accessOr.push({ property: { organizationId: { in: orgIds } } });
    }

    return this.prisma.match.findMany({
      where: {
        AND: [
          {
            OR: accessOr,
          },
          ...extra,
        ],
      },
      orderBy,
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
      void this.mlClient.recordFeedback(matchId, { accepted: false });
    } else if (status === MatchStatus.ACCEPTED && opts?.accepted === true) {
      void this.mlClient.recordFeedback(matchId, {
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
    void this.mlClient.recordFeedback(m.id, {
      convertedToDeal: true,
      dealClosed: true,
    });
  }
}
