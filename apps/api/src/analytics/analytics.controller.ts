import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('broker/me')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.HNI)
  async brokerMe(@CurrentUser() user: JwtPayloadUser) {
    if (user.role === UserRole.ADMIN) {
      const [leads, deals, closedDeals, matchCount] = await Promise.all([
        this.prisma.lead.count(),
        this.prisma.deal.count(),
        this.prisma.deal.count({ where: { stage: 'CLOSURE' } }),
        this.prisma.match.count(),
      ]);
      return {
        leads,
        deals,
        closedDeals,
        matchCount,
        conversionRate: deals
          ? Number(((closedDeals / deals) * 100).toFixed(1))
          : 0,
      };
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.sub },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);

    const matchWhere =
      orgIds.length > 0
        ? {
            OR: [
              { property: { postedById: user.sub } },
              { requirement: { userId: user.sub } },
              { property: { organizationId: { in: orgIds } } },
            ],
          }
        : {
            OR: [
              { property: { postedById: user.sub } },
              { requirement: { userId: user.sub } },
            ],
          };

    if (!orgIds.length) {
      const [leads, deals, closedDeals, matchCount] = await Promise.all([
        this.prisma.lead.count({ where: { ownerId: user.sub } }),
        this.prisma.deal.count({
          where: {
            OR: [
              { property: { postedById: user.sub } },
              { requirement: { userId: user.sub } },
            ],
          },
        }),
        this.prisma.deal.count({
          where: {
            stage: 'CLOSURE',
            OR: [
              { property: { postedById: user.sub } },
              { requirement: { userId: user.sub } },
            ],
          },
        }),
        this.prisma.match.count({ where: matchWhere }),
      ]);
      return {
        leads,
        deals,
        closedDeals,
        matchCount,
        conversionRate: deals
          ? Number(((closedDeals / deals) * 100).toFixed(1))
          : 0,
      };
    }

    const [leads, deals, closedDeals, matchCount] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId: { in: orgIds } } }),
      this.prisma.deal.count({ where: { organizationId: { in: orgIds } } }),
      this.prisma.deal.count({
        where: { organizationId: { in: orgIds }, stage: 'CLOSURE' },
      }),
      this.prisma.match.count({ where: matchWhere }),
    ]);
    return {
      leads,
      deals,
      closedDeals,
      matchCount,
      conversionRate: deals
        ? Number(((closedDeals / deals) * 100).toFixed(1))
        : 0,
    };
  }

  @Get('deals')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.HNI, UserRole.SELLER)
  async deals(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId?: string,
  ) {
    if (user.role === UserRole.ADMIN && !organizationId?.trim()) {
      const stages = await this.prisma.deal.groupBy({
        by: ['stage'],
        _count: true,
      });
      return { stages };
    }
    if (!organizationId?.trim()) return { stages: [] };
    const stages = await this.prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId },
      _count: true,
    });
    return { stages };
  }

  @Get('area-demand')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.HNI)
  areaDemand() {
    return this.prisma.requirement.groupBy({
      by: ['city'],
      _count: true,
    });
  }
}
