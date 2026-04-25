import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ListingDuplicateRisk = {
  risk: 'low' | 'elevated' | 'unknown';
  similarListingsInCity?: number;
  reason?: string;
};

@Injectable()
export class FraudService {
  constructor(private readonly prisma: PrismaService) {}

  /** Heuristic: many active listings in same city may indicate duplicate spam (Phase 1 stub). */
  async duplicateListingRisk(
    propertyId: string,
  ): Promise<ListingDuplicateRisk> {
    const p = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { city: true },
    });
    if (!p) return { risk: 'unknown', reason: 'Property not found' };

    const near = await this.prisma.property.count({
      where: {
        id: { not: propertyId },
        city: p.city,
        status: 'active',
      },
    });

    return {
      risk: near > 3 ? 'elevated' : 'low',
      similarListingsInCity: near,
    };
  }

  /** Listings created by this user in the last hour (spam velocity heuristic). */
  async listingCreationVelocity(
    userId: string,
    windowMs = 3600_000,
  ): Promise<{ count: number; elevated: boolean }> {
    const since = new Date(Date.now() - windowMs);
    const count = await this.prisma.property.count({
      where: { postedById: userId, createdAt: { gte: since } },
    });
    return { count, elevated: count > 5 };
  }

  listCases(take = 100) {
    return this.prisma.fraudCase.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async createCase(params: {
    subjectUserId?: string | null;
    propertyId?: string | null;
    dealId?: string | null;
    reason?: string | null;
    score?: number;
  }) {
    return this.prisma.fraudCase.create({
      data: {
        subjectUserId: params.subjectUserId ?? undefined,
        propertyId: params.propertyId ?? undefined,
        dealId: params.dealId ?? undefined,
        reason: params.reason ?? undefined,
        score: params.score ?? 0,
        status: 'open',
      },
    });
  }

  async setCaseStatus(params: {
    caseId: string;
    adminUserId: string;
    status: 'open' | 'review' | 'blocked' | 'cleared';
  }) {
    const allowed = new Set(['open', 'review', 'blocked', 'cleared']);
    if (!allowed.has(params.status)) {
      throw new BadRequestException('Invalid status');
    }
    const row = await this.prisma.fraudCase.findUnique({
      where: { id: params.caseId },
    });
    if (!row) throw new NotFoundException('Case not found');

    await this.prisma.fraudCase.update({
      where: { id: params.caseId },
      data: {
        status: params.status,
        resolvedById: params.adminUserId,
      },
    });

    if (params.status === 'blocked') {
      if (row.propertyId) {
        await this.prisma.property.updateMany({
          where: { id: row.propertyId },
          data: { status: 'inactive' },
        });
      }
      if (row.subjectUserId) {
        const u = await this.prisma.user.findUnique({
          where: { id: row.subjectUserId },
          select: { trustScore: true },
        });
        if (u) {
          await this.prisma.user.update({
            where: { id: row.subjectUserId },
            data: { trustScore: Math.max(0, (u.trustScore ?? 0) - 30) },
          });
        }
      }
    }

    return this.prisma.fraudCase.findUnique({ where: { id: params.caseId } });
  }
}
