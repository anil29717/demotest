import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

/**
 * Stripe webhook entrypoint (Phase 1 stub): when STRIPE_WEBHOOK_SECRET is set, requires a
 * non-empty `stripe-signature` header. Full Stripe signature verification belongs in production.
 */
@Controller('billing')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

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
}
