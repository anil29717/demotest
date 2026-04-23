import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  myLogs(@CurrentUser() user: JwtPayloadUser, @Query('take') take?: string) {
    const n = Math.min(200, Math.max(1, parseInt(take ?? '50', 10) || 50));
    return this.prisma.activityLog.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: n,
    });
  }

  /** Module 31 — platform admin reads org-scoped trail */
  @Get('organization')
  async orgLogs(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string,
    @Query('take') take?: string,
  ) {
    if (user.role !== 'ADMIN') throw new ForbiddenException();
    if (!organizationId) return [];
    const n = Math.min(500, Math.max(1, parseInt(take ?? '100', 10) || 100));
    const [deals, props] = await Promise.all([
      this.prisma.deal.findMany({ where: { organizationId }, select: { id: true } }),
      this.prisma.property.findMany({ where: { organizationId }, select: { id: true } }),
    ]);
    const dealIds = deals.map((d) => d.id);
    const propIds = props.map((p) => p.id);
    const clauses: { entityType: string; entityId: { in: string[] } }[] = [];
    if (dealIds.length) clauses.push({ entityType: 'deal', entityId: { in: dealIds } });
    if (propIds.length) clauses.push({ entityType: 'property', entityId: { in: propIds } });
    if (!clauses.length) return [];
    return this.prisma.activityLog.findMany({
      where: { OR: clauses },
      orderBy: { createdAt: 'desc' },
      take: n,
    });
  }
}
