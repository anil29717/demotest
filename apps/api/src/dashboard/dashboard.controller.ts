import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async summary(@CurrentUser() user: JwtPayloadUser) {
    const [memberships, notifications, myRequirements, myProperties, myMatches] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { userId: user.sub },
        select: { organizationId: true },
      }),
      this.prisma.notification.findMany({
        where: { userId: user.sub, read: false },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.requirement.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.property.findMany({
        where: { postedById: user.sub, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      this.prisma.match.findMany({
        where: {
          OR: [{ property: { postedById: user.sub } }, { requirement: { userId: user.sub } }],
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
      unreadCount: notifications.length,
      digestStrip: notifications.map((n) => ({ id: n.id, title: n.title, body: n.body })),
      quickStats: {
        myProperties: myProperties.length,
        myRequirements: myRequirements.length,
        myMatches: myMatches.length,
      },
      recentMatches: myMatches,
      hotRequirements,
    };
  }
}
