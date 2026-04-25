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
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.sub },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (!orgIds.length) {
      return {
        leads: 0,
        deals: 0,
        closedDeals: 0,
        matchCount: 0,
        conversionRate: 0,
      };
    }
    const [leads, deals, closedDeals, matchCount] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId: { in: orgIds } } }),
      this.prisma.deal.count({ where: { organizationId: { in: orgIds } } }),
      this.prisma.deal.count({
        where: { organizationId: { in: orgIds }, stage: 'CLOSURE' },
      }),
      this.prisma.match.count({
        where: { property: { organizationId: { in: orgIds } } },
      }),
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
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.HNI)
  async deals(@Query('organizationId') organizationId: string) {
    if (!organizationId) return { stages: [] };
    const deals = await this.prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId },
      _count: true,
    });
    return { stages: deals };
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
