import { Injectable } from '@nestjs/common';
import { DealStage, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AVG_DAYS_BY_STAGE: Record<string, number> = {
  LEAD: 2,
  MATCH: 3,
  SITE_VISIT: 7,
  NEGOTIATION: 14,
  LEGAL: 21,
  LOAN: 14,
  INSURANCE: 7,
  PAYMENT: 3,
  CLOSURE: 1,
};

const STAGE_BASE: Record<string, number> = {
  LEAD: 10,
  MATCH: 25,
  SITE_VISIT: 40,
  NEGOTIATION: 60,
  LEGAL: 80,
  LOAN: 85,
  INSURANCE: 88,
  PAYMENT: 95,
  CLOSURE: 100,
};

@Injectable()
export class DealScoreService {
  constructor(private readonly prisma: PrismaService) {}

  private label(probability: number): 'High' | 'Medium' | 'At risk' {
    if (probability >= 70) return 'High';
    if (probability >= 40) return 'Medium';
    return 'At risk';
  }

  async calculateClosureProbability(
    deal: {
      id: string;
      stage: DealStage;
      stageEnteredAt?: Date;
      propertyId?: string | null;
      organizationId: string;
      property?: { imageUrls?: string[]; description?: string | null; price?: unknown } | null;
    },
  ) {
    const stageBase = STAGE_BASE[deal.stage] ?? 10;

    const entered = deal.stageEnteredAt ?? new Date();
    const daysInStage = Math.max(
      0,
      (Date.now() - new Date(entered).getTime()) / (1000 * 60 * 60 * 24),
    );
    const avgDays = AVG_DAYS_BY_STAGE[deal.stage] ?? 7;
    let timeScore = 10;
    if (daysInStage < avgDays) timeScore = 20;
    if (daysInStage > avgDays * 1.5) timeScore = 5;
    if (daysInStage > avgDays * 2) timeScore = 0;

    const orgBrokers = await this.prisma.organizationMember.findMany({
      where: { organizationId: deal.organizationId },
      select: { userId: true },
      take: 5,
    });
    const brokerIds = orgBrokers.map((b) => b.userId);
    let brokerScore = 10;
    if (brokerIds.length) {
      const [allDeals, closedDeals] = await Promise.all([
        this.prisma.deal.count({ where: { organizationId: deal.organizationId } }),
        this.prisma.deal.count({
          where: { organizationId: deal.organizationId, stage: DealStage.CLOSURE },
        }),
      ]);
      if (allDeals >= 3) {
        const ratio = allDeals > 0 ? closedDeals / allDeals : 0;
        brokerScore =
          ratio > 0.6 ? 20 : ratio > 0.4 ? 15 : ratio > 0.2 ? 10 : 5;
      }
    }

    const p = deal.property;
    let propertyQuality = 0;
    if ((p?.imageUrls?.length ?? 0) > 0) propertyQuality += 4;
    if ((p?.description?.length ?? 0) > 100) propertyQuality += 3;
    if (Number(p?.price ?? 0) > 0) propertyQuality += 3;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [notesRecent, docsCount] = await Promise.all([
      this.prisma.activityLog.count({
        where: {
          entityType: 'deal',
          entityId: deal.id,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.document.count({ where: { dealId: deal.id } }),
    ]);
    let engagement = 0;
    if (notesRecent > 0) engagement += 4;
    if (docsCount > 0) engagement += 3;
    if (notesRecent > 2) engagement += 3;

    const weighted =
      stageBase * 0.4 +
      timeScore * 0.2 +
      brokerScore * 0.2 +
      propertyQuality * 0.1 +
      engagement * 0.1;
    const probability = Math.max(0, Math.min(100, Math.round(weighted)));
    return {
      probability,
      label: this.label(probability),
      factors: {
        stageBase,
        timeScore,
        brokerScore,
        propertyQuality,
        engagement,
      },
    };
  }
}

