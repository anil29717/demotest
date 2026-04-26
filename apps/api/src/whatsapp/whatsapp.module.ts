import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchingModule } from '../matching/matching.module';
import { OutboundModule } from '../outbound/outbound.module';
import { RequirementsModule } from '../requirements/requirements.module';
import { WhatsappAdminController } from './whatsapp-admin.controller';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappIngestService } from './whatsapp-ingest.service';
import { NlpService } from './nlp.service';
import { WhatsappRoutingService } from './whatsapp-routing.service';
import { WhatsappWebhookMetricsService } from './whatsapp-webhook-metrics.service';

@Module({
  imports: [
    OutboundModule,
    AuthModule,
    RequirementsModule,
    MatchingModule,
  ],
  controllers: [WhatsappController, WhatsappAdminController],
  providers: [
    WhatsappIngestService,
    NlpService,
    WhatsappRoutingService,
    WhatsappWebhookMetricsService,
  ],
  exports: [
    OutboundModule,
    WhatsappIngestService,
    WhatsappWebhookMetricsService,
    NlpService,
  ],
})
export class WhatsappModule {}
