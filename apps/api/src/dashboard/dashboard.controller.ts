import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
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
  async summary(@CurrentUser() user: JwtPayloadUser) {
    if (user.role === UserRole.ADMIN) return this.adminSummary(user.sub);
    if (user.role === UserRole.BROKER) return this.brokerSummary(user.sub);
    if (user.role === UserRole.BUYER) return this.buyerSummary(user.sub);
    if (
      user.role === UserRole.NRI ||
      user.role === UserRole.HNI ||
      user.role === UserRole.INSTITUTIONAL_BUYER
    ) {
      const r = await this.buyerSummary(user.sub);
      return { ...r, role: user.role };
    }
    if (user.role === UserRole.INSTITUTIONAL_SELLER) {
      const r = await this.sellerSummary(user.sub);
      return { ...r, role: user.role };
    }
    return this.sellerSummary(user.sub);
  }

  @Get('sidebar-counts')
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.HNI,
    UserRole.BUILDER,
    UserRole.INSTITUTIONAL_BUYER,
    UserRole.INSTITUTIONAL_SELLER,
  )
  async sidebarCounts(
    @CurrentUser() user: JwtPayloadUser,
    @Query('includeNonCritical') includeNonCritical?: string,
  ) {
    const includeLazy = String(includeNonCritical ?? '').toLowerCase() === 'true';

    if (user.role === UserRole.ADMIN) {
      const [properties, requirements, matches, deals] = await Promise.all([
        this.prisma.property.count({ where: { status: 'active' } }),
        this.prisma.requirement.count(),
        this.prisma.match.count(),
        this.prisma.deal.count(),
      ]);
      return {
        properties,
        requirements,
        matches,
        deals,
        hotLeads: includeLazy
          ? (
              await this.prisma.lead.findMany({ select: { status: true } })
            ).filter((row) => String(row.status ?? '').toUpperCase() === 'HOT').length
          : 0,
        compliance: 0,
        auctions: 0,
        institutions: 0,
        chatUnread: 0,
      };
    }

    const [myProperties, myRequirements, myMatches, myDeals] = await Promise.all([
      this.prisma.property.count({
        where: {
          postedById: user.sub,
          status: 'active',
        },
      }),
      this.prisma.requirement.count({
        where: { userId: user.sub },
      }),
      this.prisma.match.count({
        where: {
          OR: [{ property: { postedById: user.sub } }, { requirement: { userId: user.sub } }],
        },
      }),
      this.prisma.deal.count({
        where: {
          OR: [{ property: { postedById: user.sub } }, { requirement: { userId: user.sub } }],
        },
      }),
    ]);

    if (!includeLazy) {
      return {
        properties: myProperties,
        requirements: myRequirements,
        matches: myMatches,
        deals: myDeals,
        hotLeads: 0,
        compliance: 0,
        auctions: 0,
        institutions: 0,
        chatUnread: 0,
      };
    }

    const [leads] = await Promise.all([
      this.prisma.lead.findMany({
        where: { ownerId: user.sub },
        select: { status: true },
      }),
    ]);

    return {
      properties: myProperties,
      requirements: myRequirements,
      matches: myMatches,
      deals: myDeals,
      hotLeads: leads.filter((row) => String(row.status ?? '').toUpperCase() === 'HOT').length,
      compliance: 0,
      auctions: 0,
      institutions: 0,
      chatUnread: 0,
    };
  }

  /** Platform admins see global metrics (not only orgs where they hold ORG_ADMIN membership). */
  private async adminSummary(userId: string) {
    const [orgCount, notifications] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const [
      propertiesCount,
      requirementsCount,
      dealsCount,
      matchesCount,
      hotRequirements,
      recentDeals,
      recentMatches,
    ] = await Promise.all([
      this.prisma.property.count({ where: { status: 'active' } }),
      this.prisma.requirement.count(),
      this.prisma.deal.count(),
      this.prisma.match.count(),
      this.prisma.requirement.findMany({
        where: { tag: 'HOT' },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          city: true,
          tag: true,
          urgency: true,
          budgetMin: true,
          budgetMax: true,
          createdAt: true,
        },
      }),
      this.prisma.deal.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          stage: true,
          organizationId: true,
          updatedAt: true,
        },
      }),
      this.prisma.match.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          property: { select: { id: true, title: true, city: true } },
          requirement: { select: { id: true, city: true, tag: true } },
        },
      }),
    ]);

    return {
      role: UserRole.ADMIN,
      unreadCount: notifications.length,
      digestStrip: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
      })),
      quickStats: {
        myProperties: propertiesCount,
        myRequirements: requirementsCount,
        myMatches: matchesCount,
      },
      recentMatches,
      hotRequirements,
      adminOverview: {
        organizations: orgCount,
        activeDeals: dealsCount,
        recentDeals,
      },
    };
  }

  private async brokerSummary(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);

    const matchWhere = {
      OR: [
        { property: { postedById: userId } },
        { requirement: { userId } },
        ...(orgIds.length > 0
          ? [{ property: { organizationId: { in: orgIds } } }]
          : []),
      ],
    };

    const propertyScope = {
      status: 'active' as const,
      OR: [
        { postedById: userId },
        ...(orgIds.length > 0 ? [{ organizationId: { in: orgIds } }] : []),
      ],
    };

    const [
      notifications,
      myRequirements,
      myProperties,
      recentMatches,
      myRequirementsCount,
      myPropertiesCount,
      myMatchesCount,
    ] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.requirement.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.property.findMany({
        where: propertyScope,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.match.findMany({
        where: matchWhere,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          property: { select: { id: true, title: true, city: true } },
          requirement: { select: { id: true, city: true, tag: true } },
        },
      }),
      this.prisma.requirement.count({ where: { userId } }),
      this.prisma.property.count({ where: propertyScope }),
      this.prisma.match.count({ where: matchWhere }),
    ]);

    const hotRequirements = orgIds.length
      ? await this.prisma.requirement.findMany({
          where: {
            tag: 'HOT',
            matches: {
              some: {
                property: {
                  organizationId: { in: orgIds },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            city: true,
            tag: true,
            urgency: true,
            budgetMin: true,
            budgetMax: true,
            createdAt: true,
          },
        })
      : [];

    return {
      role: UserRole.BROKER,
      unreadCount: notifications.length,
      digestStrip: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
      })),
      quickStats: {
        myProperties: myPropertiesCount,
        myRequirements: myRequirementsCount,
        myMatches: myMatchesCount,
      },
      recentMatches,
      hotRequirements,
    };
  }

  private async buyerSummary(userId: string) {
    const [
      notifications,
      myRequirements,
      recentMatches,
      myDeals,
      myRequirementsCount,
      myMatchesCount,
      activeDealsCount,
    ] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.requirement.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.match.findMany({
        where: { requirement: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          property: { select: { id: true, title: true, city: true } },
          requirement: { select: { id: true, city: true, tag: true } },
        },
      }),
      this.prisma.deal.findMany({
        where: { requirement: { userId } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, stage: true, updatedAt: true },
      }),
      this.prisma.requirement.count({ where: { userId } }),
      this.prisma.match.count({ where: { requirement: { userId } } }),
      this.prisma.deal.count({ where: { requirement: { userId } } }),
    ]);

    return {
      role: UserRole.BUYER,
      unreadCount: notifications.length,
      digestStrip: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
      })),
      quickStats: {
        myProperties: 0,
        myRequirements: myRequirementsCount,
        myMatches: myMatchesCount,
      },
      recentMatches,
      hotRequirements: [],
      buyerOverview: {
        activeDeals: activeDealsCount,
        myDeals,
      },
    };
  }

  private async sellerSummary(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const propWhere = {
      status: 'active' as const,
      OR: [
        { postedById: userId },
        ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
      ],
    };
    const sellerAccessForDeals = {
      OR: [
        { property: { postedById: userId } },
        ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
      ],
    };
    const sellerAccessForMatches = {
      OR: [
        { property: { postedById: userId } },
        ...(orgIds.length
          ? [{ property: { organizationId: { in: orgIds } } }]
          : []),
      ],
    };
    const [
      notifications,
      myProperties,
      recentMatches,
      myDeals,
      myPropertiesCount,
      myMatchesCount,
      activeDealsCount,
    ] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.property.findMany({
        where: propWhere,
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.match.findMany({
        where: sellerAccessForMatches,
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          property: { select: { id: true, title: true, city: true } },
          requirement: { select: { id: true, city: true, tag: true } },
        },
      }),
      this.prisma.deal.findMany({
        where: sellerAccessForDeals,
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: { id: true, stage: true, updatedAt: true },
      }),
      this.prisma.property.count({ where: propWhere }),
      this.prisma.match.count({ where: sellerAccessForMatches }),
      this.prisma.deal.count({ where: sellerAccessForDeals }),
    ]);

    return {
      role: UserRole.SELLER,
      unreadCount: notifications.length,
      digestStrip: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
      })),
      quickStats: {
        myProperties: myPropertiesCount,
        myRequirements: 0,
        myMatches: myMatchesCount,
      },
      recentMatches,
      hotRequirements: [],
      sellerOverview: {
        activeDeals: activeDealsCount,
        myDeals,
      },
    };
  }
}
