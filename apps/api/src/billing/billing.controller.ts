import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { BillingService } from './billing.service';
import { BillingCheckoutDto } from './dto/billing-checkout.dto';
import { BillingVerifyDto } from './dto/billing-verify.dto';

/** Phase 1 checkout DTO — preserved for /billing/checkout-session */
class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsIn(['broker_pro', 'nri_services', 'institutional_listing'])
  sku!: 'broker_pro' | 'nri_services' | 'institutional_listing';
}

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.BROKER,
  UserRole.NRI,
  UserRole.HNI,
  UserRole.INSTITUTIONAL_BUYER,
  UserRole.INSTITUTIONAL_SELLER,
)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  plans(@CurrentUser() user: JwtPayloadUser) {
    return this.billing.getPlans(user.sub);
  }

  @Post('checkout')
  checkoutRazorpay(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: BillingCheckoutDto,
  ) {
    return this.billing.createCheckoutSession(user.sub, dto.planId, dto.interval);
  }

  @Post('verify')
  verify(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: BillingVerifyDto,
  ) {
    return this.billing.verifyAndActivate(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
      user.sub,
    );
  }

  @Get('subscription')
  subscription(@CurrentUser() user: JwtPayloadUser) {
    return this.billing.getCurrentSubscription(user.sub);
  }

  @Delete('subscription')
  cancelSubscription(@CurrentUser() user: JwtPayloadUser) {
    return this.billing.cancelSubscription(user.sub);
  }

  @Get('invoices')
  invoices(@CurrentUser() user: JwtPayloadUser) {
    return this.billing.getInvoices(user.sub);
  }

  /** Phase 1 stub — unchanged route for existing clients */
  @Post('checkout-session')
  checkout(@CurrentUser() user: JwtPayloadUser, @Body() dto: CheckoutDto) {
    return {
      url: `https://checkout.example.com/session?plan=${encodeURIComponent(dto.plan)}&sku=${dto.sku}&user=${user.sub}`,
      message:
        'Stub checkout URL. Integrate Stripe/Razorpay webhooks in production.',
    };
  }
}
