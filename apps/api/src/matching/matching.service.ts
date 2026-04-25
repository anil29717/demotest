import { Injectable } from '@nestjs/common';
import { MatchStatus, Property, Requirement, Urgency } from '@prisma/client';
import { HOT_MATCH_THRESHOLD, MATCH_WEIGHTS } from '@ar-buildwel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LeadsService } from '../leads/leads.service';

export type MatchFactors = {
  location: number;
  budget: number;
  propertyType: number;
  dealType: number;
  areaSqft: number;
  urgency: number;
};

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly leads: LeadsService,
  ) {}

  private scorePair(
    property: Property,
    req: Requirement,
  ): { score: number; factors: MatchFactors } {
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
    const budget =
      price >= bmin && price <= bmax
        ? 100
        : price < bmin
          ? Math.max(0, 100 - ((bmin - price) / bmin) * 100)
          : Math.max(0, 100 - ((price - bmax) / bmax) * 50);

    const propertyType = property.propertyType === req.propertyType ? 100 : 0;
    const dealType = property.dealType === req.dealType ? 100 : 0;

    const sq =
      property.areaSqft >= req.areaSqftMin &&
      property.areaSqft <= req.areaSqftMax
        ? 100
        : 50;

    const urgency: number =
      req.urgency === Urgency.IMMEDIATE
        ? 100
        : req.urgency === Urgency.WITHIN_30_DAYS
          ? 70
          : 40;

    const factors: MatchFactors = {
      location: loc * MATCH_WEIGHTS.location,
      budget: budget * MATCH_WEIGHTS.budget,
      propertyType: propertyType * MATCH_WEIGHTS.propertyType,
      dealType: dealType * MATCH_WEIGHTS.dealType,
      areaSqft: sq * MATCH_WEIGHTS.areaSqft,
      urgency: urgency * MATCH_WEIGHTS.urgency,
    };

    const score = Math.min(
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

    return { score, factors };
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
    const { score, factors } = this.scorePair(property, req);
    if (score < 30) return;

    const hotMatch = score >= HOT_MATCH_THRESHOLD;

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
        matchScore: score,
        matchFactors: factors as object,
        hotMatch,
      },
      update: {
        matchScore: score,
        matchFactors: factors as object,
        hotMatch,
      },
    });

    try {
      await this.leads.createFromMatchIfBroker(property, req, score);
    } catch {
      // Non-blocking side-effect: matching should still persist even if lead sync fails.
    }
    try {
      await this.notifications.notifyMatch(property, req, score, hotMatch);
    } catch {
      // Non-blocking side-effect: matching should still persist even if notification fails.
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

  async updateStatus(userId: string, matchId: string, status: MatchStatus) {
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
    return this.prisma.match.update({
      where: { id: matchId },
      data: { status },
    });
  }
}
