import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';

@Module({
  controllers: [BillingController, BillingWebhookController],
})
export class BillingModule {}
