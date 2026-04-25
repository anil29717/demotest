import { Module } from '@nestjs/common';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { EmailOutboundService } from './email-outbound.service';
import { NotificationsDigestScheduler } from './notifications-digest.scheduler';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [WhatsappModule],
  controllers: [NotificationsController],
  providers: [
    EmailOutboundService,
    NotificationsService,
    NotificationsDigestScheduler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
