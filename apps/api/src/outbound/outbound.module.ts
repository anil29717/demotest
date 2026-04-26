import { Module } from '@nestjs/common';
import { WhatsappOutboundService } from '../whatsapp/whatsapp-outbound.service';

/** Meta WhatsApp Cloud API outbound — isolated from WhatsappModule to avoid Nest DI cycles with Matching/Notifications. */
@Module({
  providers: [WhatsappOutboundService],
  exports: [WhatsappOutboundService],
})
export class OutboundModule {}
