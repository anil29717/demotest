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
import { createHmac, timingSafeEqual } from 'crypto';
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
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string | undefined,
    @Body() parsedBody: Record<string, unknown>,
  ) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (secret) {
      if (!sig?.trim()) {
        throw new UnauthorizedException('Missing stripe-signature');
      }
      const raw = req.rawBody;
      if (!Buffer.isBuffer(raw)) {
        throw new UnauthorizedException('Raw request body required for signature verification');
      }
      const valid = this.verifyStripeSignature(raw, sig, secret);
      if (!valid) {
        throw new UnauthorizedException('Invalid stripe-signature');
      }
    }
    this.logger.log(
      `Billing webhook received type=${String(parsedBody.type ?? 'unknown')}`,
    );
    return { received: true };
  }

  private verifyStripeSignature(
    rawBody: Buffer,
    signatureHeader: string,
    secret: string,
  ): boolean {
    const parts = signatureHeader.split(',').map((p) => p.trim());
    const ts = parts.find((p) => p.startsWith('t='))?.slice(2);
    const v1 = parts.find((p) => p.startsWith('v1='))?.slice(3);
    if (!ts || !v1) return false;
    const signedPayload = `${ts}.${rawBody.toString('utf8')}`;
    const expectedHex = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expectedHex), Buffer.from(v1));
    } catch {
      return false;
    }
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
