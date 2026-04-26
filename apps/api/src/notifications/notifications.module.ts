import { Module } from '@nestjs/common';
import { OutboundModule } from '../outbound/outbound.module';
import { EmailOutboundService } from './email-outbound.service';
import { NotificationsDigestScheduler } from './notifications-digest.scheduler';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [OutboundModule],
  controllers: [NotificationsController],
  providers: [
    EmailOutboundService,
    NotificationsService,
    NotificationsDigestScheduler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
