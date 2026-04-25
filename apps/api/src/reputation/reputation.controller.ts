import { Controller, Get, UseGuards } from '@nestjs/common';
import { DealStage } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Module 44 — basic reputation from closed deals (Phase 1 simplified) */
@Controller('reputation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.BROKER,
  UserRole.BUYER,
  UserRole.SELLER,
  UserRole.NRI,
  UserRole.HNI,
  UserRole.INSTITUTIONAL_BUYER,
  UserRole.INSTITUTIONAL_SELLER,
)
export class ReputationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: JwtPayloadUser) {
    const closed = await this.prisma.deal.count({
      where: {
        stage: DealStage.CLOSURE,
        organization: { members: { some: { userId: user.sub } } },
      },
    });
    const score = Math.min(100, 40 + closed * 5);
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { reputationScore: score },
    });
    return {
      userId: user.sub,
      reputationScore: score,
      closedDealsAttributed: closed,
      note: 'Phase 2: graph + co-broker attestations',
    };
  }

  /** Module 44 — lightweight graph-shaped payload from reviews + deals (Phase 1 depth stub). */
  @Get('graph/me')
  async graphMe(@CurrentUser() user: JwtPayloadUser) {
    const reviews = await this.prisma.review.findMany({
      where: { OR: [{ reviewerId: user.sub }, { targetUserId: user.sub }] },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reviewerId: true,
        targetUserId: true,
        rating: true,
        propertyId: true,
        createdAt: true,
      },
    });
    const nodes = new Map<string, { id: string; kind: string }>();
    nodes.set(user.sub, { id: user.sub, kind: 'self' });
    const edges: Array<{
      from: string;
      to: string;
      kind: string;
      weight: number;
      at: string;
    }> = [];
    for (const r of reviews) {
      nodes.set(r.reviewerId, { id: r.reviewerId, kind: 'user' });
      nodes.set(r.targetUserId, { id: r.targetUserId, kind: 'user' });
      edges.push({
        from: r.reviewerId,
        to: r.targetUserId,
        kind: 'review',
        weight: r.rating,
        at: r.createdAt.toISOString(),
      });
    }
    return {
      userId: user.sub,
      nodes: [...nodes.values()],
      edges,
      note: 'Derived from Review rows; expand with co-broker and deal-party edges in Phase 2.',
    };
  }
}
