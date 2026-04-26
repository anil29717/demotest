import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing-webhook.controller';
import { BillingService } from './billing.service';
import { FeeService } from './fee.service';
import { RazorpayService } from './razorpay.service';

@Module({
  controllers: [BillingController, BillingWebhookController],
  providers: [RazorpayService, BillingService, FeeService],
  exports: [RazorpayService, BillingService, FeeService],
})
export class BillingModule {}
