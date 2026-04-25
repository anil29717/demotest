import { Module } from '@nestjs/common';
import { WhatsappAdminController } from './whatsapp-admin.controller';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappIngestService } from './whatsapp-ingest.service';
import { WhatsappOutboundService } from './whatsapp-outbound.service';
import { WhatsappWebhookMetricsService } from './whatsapp-webhook-metrics.service';

@Module({
  controllers: [WhatsappController, WhatsappAdminController],
  providers: [
    WhatsappOutboundService,
    WhatsappIngestService,
    WhatsappWebhookMetricsService,
  ],
  exports: [
    WhatsappOutboundService,
    WhatsappIngestService,
    WhatsappWebhookMetricsService,
  ],
})
export class WhatsappModule {}
