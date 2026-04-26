import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { BillingService } from './billing.service';

/**
 * Stripe webhook entrypoint (Phase 1 stub): when STRIPE_WEBHOOK_SECRET is set, requires a
 * non-empty `stripe-signature` header. Full Stripe signature verification belongs in production.
 */
@Controller('billing')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

  constructor(private readonly billing: BillingService) {}

  @Post('webhook/stripe')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  async stripe(
    @Headers('stripe-signature') sig: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (secret && !sig?.trim()) {
      throw new UnauthorizedException('Missing stripe-signature');
    }
    this.logger.log(`Billing webhook received type=${String(body.type ?? 'unknown')}`);
    return { received: true };
  }

  @Post('webhook/razorpay')
  async razorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') sig: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!Buffer.isBuffer(raw)) {
      this.logger.warn('Razorpay webhook: raw body missing; configure Nest rawBody');
      return { received: true };
    }
    return this.billing.handleWebhook(raw, sig);
  }
}
