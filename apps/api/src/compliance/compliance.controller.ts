import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ComplianceService } from './compliance.service';

/** Module 32 — advisory feed + config-driven stage rules when dealId is supplied */
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.BROKER,
  UserRole.INSTITUTIONAL_BUYER,
  UserRole.INSTITUTIONAL_SELLER,
)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get('feed')
  feed(@CurrentUser() user: JwtPayloadUser, @Query('dealId') dealId?: string) {
    return this.compliance.buildFeed(user.sub, user.role, dealId);
  }
}
