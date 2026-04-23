import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  plan!: string;

  @IsIn(['broker_pro', 'nri_services', 'institutional_listing'])
  sku!: 'broker_pro' | 'nri_services' | 'institutional_listing';
}

/** Phase 1: stub — wire Stripe/Razorpay when merchant account is ready */
@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  @Post('checkout-session')
  checkout(@CurrentUser() user: JwtPayloadUser, @Body() dto: CheckoutDto) {
    return {
      url: `https://checkout.example.com/session?plan=${encodeURIComponent(dto.plan)}&sku=${dto.sku}&user=${user.sub}`,
      message: 'Stub checkout URL. Integrate Stripe/Razorpay webhooks in production.',
    };
  }
}
