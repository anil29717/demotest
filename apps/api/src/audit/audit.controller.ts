import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
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
  async myLogs(
    @CurrentUser() user: JwtPayloadUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(200, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    const skip = Math.max(0, parseInt(offset ?? '0', 10) || 0);
    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.activityLog.count({ where: { userId: user.sub } }),
    ]);
    return { data, total, hasMore: skip + data.length < total };
  }

  /** Module 31 — platform admin reads org-scoped trail */
  @Get('organization')
  @Roles(UserRole.ADMIN)
  async orgLogs(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string,
    @Query('take') take?: string,
  ) {
    if (user.role !== UserRole.ADMIN) throw new ForbiddenException();
    if (!organizationId) return [];
    const n = Math.min(500, Math.max(1, parseInt(take ?? '100', 10) || 100));
    const [deals, props] = await Promise.all([
      this.prisma.deal.findMany({
        where: { organizationId },
        select: { id: true },
      }),
      this.prisma.property.findMany({
        where: { organizationId },
        select: { id: true },
      }),
    ]);
    const dealIds = deals.map((d) => d.id);
    const propIds = props.map((p) => p.id);
    const clauses: { entityType: string; entityId: { in: string[] } }[] = [];
    if (dealIds.length)
      clauses.push({ entityType: 'deal', entityId: { in: dealIds } });
    if (propIds.length)
      clauses.push({ entityType: 'property', entityId: { in: propIds } });
    if (!clauses.length) return [];
    return this.prisma.activityLog.findMany({
      where: { OR: clauses },
      orderBy: { createdAt: 'desc' },
      take: n,
    });
  }
}
