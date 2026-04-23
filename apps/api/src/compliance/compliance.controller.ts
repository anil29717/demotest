import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

/** Module 32 — in-app advisory feed (Phase 1 static + deal-stage hooks later) */
@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  @Get('feed')
  feed(@CurrentUser() user: JwtPayloadUser, @Query('dealId') dealId?: string) {
    return {
      userId: user.sub,
      dealId: dealId ?? null,
      items: [
        {
          id: '1',
          severity: 'info',
          title: 'Verify RERA registration',
          body: 'Confirm broker RERA before site visit for this corridor.',
        },
        {
          id: '2',
          severity: 'warning',
          title: 'Institutional NDA',
          body: 'Unmasked financials require signed NDA and data-room access log.',
        },
      ],
    };
  }
}
