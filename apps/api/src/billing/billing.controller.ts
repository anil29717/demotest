import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
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
  @Get('plans')
  plans() {
    return {
      plans: [
        {
          id: 'broker_pro',
          name: 'Broker Pro',
          priceInrAnnual: 24999,
          entitlements: ['crm_advanced', 'lead_routing'],
        },
        {
          id: 'nri_services',
          name: 'NRI Services',
          priceInrAnnual: 14999,
          entitlements: ['tax_pack', 'concierge'],
        },
        {
          id: 'institutional_listing',
          name: 'Institutional listing',
          priceInrPerDeal: 50000,
          entitlements: ['data_room', 'nda_workflow'],
        },
      ],
      note: 'Stub catalog. Stripe/Razorpay product ids map in Phase 2 merchant setup.',
    };
  }

  @Post('checkout-session')
  checkout(@CurrentUser() user: JwtPayloadUser, @Body() dto: CheckoutDto) {
    return {
      url: `https://checkout.example.com/session?plan=${encodeURIComponent(dto.plan)}&sku=${dto.sku}&user=${user.sub}`,
      message:
        'Stub checkout URL. Integrate Stripe/Razorpay webhooks in production.',
    };
  }
}
