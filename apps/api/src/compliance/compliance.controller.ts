import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ComplianceService } from './compliance.service';

/** Persistent alerts (NDA/RERA gaps), advisory rules, resolve actions, deal-scoped lists */
@Controller('compliance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get('deals/:dealId/alerts')
  dealAlerts(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    return this.compliance.listDealAlerts(user.sub, dealId);
  }

  @Post('alerts/:id/resolve')
  resolve(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.compliance.resolveAlert(user.sub, id);
  }

  @Get('feed')
  feed(
    @CurrentUser() user: JwtPayloadUser,
    @Query('dealId') dealId?: string,
  ) {
    return this.compliance.buildFeed(user.sub, user.role, dealId);
  }
}
