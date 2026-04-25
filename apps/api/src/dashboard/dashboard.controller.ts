import { Controller, Get, UseGuards } from '@nestjs/common';
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

  private async adminSummary(userId: string) {
    const [memberships, notifications] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { userId, role: 'ADMIN' },
        select: { organizationId: true },
      }),
      this.prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);
    const orgIds = memberships.map((m) => m.organizationId);
    const [
      propertiesCount,
      requirementsCount,
      dealsCount,
      hotRequirements,
      recentDeals,
    ] =
      orgIds.length === 0
        ? [0, 0, 0, [], []]
        : await Promise.all([
            this.prisma.property.count({
              where: { organizationId: { in: orgIds }, status: 'active' },
            }),
            this.prisma.requirement.count({
              where: {
                matches: {
                  some: { property: { organizationId: { in: orgIds } } },
                },
              },
            }),
            this.prisma.deal.count({
              where: { organizationId: { in: orgIds } },
            }),
            this.prisma.requirement.findMany({
              where: {
                tag: 'HOT',
                matches: {
                  some: { property: { organizationId: { in: orgIds } } },
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
            }),
            this.prisma.deal.findMany({
              where: { organizationId: { in: orgIds } },
              orderBy: { updatedAt: 'desc' },
              take: 8,
              select: {
                id: true,
                stage: true,
                organizationId: true,
                updatedAt: true,
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
        myMatches: 0,
      },
      recentMatches: [],
      hotRequirements,
      adminOverview: {
        organizations: orgIds.length,
        activeDeals: dealsCount,
        recentDeals,
      },
    };
  }

  private async brokerSummary(userId: string) {
    const [
      memberships,
      notifications,
      myRequirements,
      myProperties,
      myMatches,
    ] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true },
      }),
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
        where: { postedById: userId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.match.findMany({
        where: {
          OR: [
            { property: { postedById: userId } },
            { requirement: { userId } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          property: { select: { id: true, title: true, city: true } },
          requirement: { select: { id: true, city: true, tag: true } },
        },
      }),
    ]);

    const orgIds = memberships.map((m) => m.organizationId);
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
        myProperties: myProperties.length,
        myRequirements: myRequirements.length,
        myMatches: myMatches.length,
      },
      recentMatches: myMatches,
      hotRequirements,
    };
  }

  private async buyerSummary(userId: string) {
    const [notifications, myRequirements, myMatches, myDeals] =
      await Promise.all([
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
        myRequirements: myRequirements.length,
        myMatches: myMatches.length,
      },
      recentMatches: myMatches,
      hotRequirements: [],
      buyerOverview: {
        activeDeals: myDeals.length,
        myDeals,
      },
    };
  }

  private async sellerSummary(userId: string) {
    const [notifications, myProperties, myMatches, myDeals] = await Promise.all(
      [
        this.prisma.notification.findMany({
          where: { userId, read: false },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        this.prisma.property.findMany({
          where: { postedById: userId, status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        this.prisma.match.findMany({
          where: { property: { postedById: userId } },
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: {
            property: { select: { id: true, title: true, city: true } },
            requirement: { select: { id: true, city: true, tag: true } },
          },
        }),
        this.prisma.deal.findMany({
          where: { property: { postedById: userId } },
          orderBy: { updatedAt: 'desc' },
          take: 8,
          select: { id: true, stage: true, updatedAt: true },
        }),
      ],
    );

    return {
      role: UserRole.SELLER,
      unreadCount: notifications.length,
      digestStrip: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
      })),
      quickStats: {
        myProperties: myProperties.length,
        myRequirements: 0,
        myMatches: myMatches.length,
      },
      recentMatches: myMatches,
      hotRequirements: [],
      sellerOverview: {
        activeDeals: myDeals.length,
        myDeals,
      },
    };
  }
}
