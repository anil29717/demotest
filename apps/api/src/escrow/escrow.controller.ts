import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { EscrowStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { EscrowConfirmDto } from './dto/escrow-confirm.dto';
import { EscrowRefundDto } from './dto/escrow-refund.dto';
import { EscrowService } from './escrow.service';

@Controller('escrow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EscrowController {
  constructor(private readonly escrow: EscrowService) {}

  @Get('admin')
  @Roles(UserRole.ADMIN)
  listEscrowsAdmin(@Query('status') status?: string) {
    const st = status?.trim().toUpperCase();
    const valid =
      st &&
      (Object.values(EscrowStatus) as string[]).includes(st);
    return this.escrow.listEscrowsForAdmin(
      valid ? { status: st as EscrowStatus } : undefined,
    );
  }

  @Post('deals/:dealId/initiate')
  @Roles(UserRole.BUYER)
  initiateEscrow(
    @Param('dealId') dealId: string,
    @Body() body: { amount: number },
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.escrow.initiateEscrow(dealId, body.amount, user.sub);
  }

  @Post('deals/:dealId/confirm')
  @Roles(UserRole.BUYER)
  confirmEscrow(
    @Param('dealId') dealId: string,
    @Body() dto: EscrowConfirmDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.escrow.confirmEscrowPayment(
      dealId,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
      user.sub,
    );
  }

  @Post('deals/:dealId/release')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  releaseEscrow(
    @Param('dealId') dealId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.escrow.releaseEscrow(dealId, user.sub);
  }

  @Post('deals/:dealId/confirm-payout')
  @Roles(UserRole.ADMIN)
  confirmPayout(
    @Param('dealId') dealId: string,
    @Body() body: { payoutReference?: string },
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.escrow.confirmManualPayout(
      dealId,
      user.sub,
      body.payoutReference ?? '',
    );
  }

  @Post('deals/:dealId/refund')
  @Roles(UserRole.ADMIN)
  refundEscrow(
    @Param('dealId') dealId: string,
    @Body() dto: EscrowRefundDto,
  ) {
    return this.escrow.refundEscrow(dealId, dto.reason);
  }

  @Post('deals/:dealId/freeze')
  @Roles(UserRole.ADMIN)
  freezeEscrow(@Param('dealId') dealId: string) {
    return this.escrow.freezeEscrow(dealId);
  }

  @Get('deals/:dealId')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUYER)
  getEscrowStatus(
    @Param('dealId') dealId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.escrow.getEscrowStatus(dealId, user.sub);
  }
}
