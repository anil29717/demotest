import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

/**
 * Fires once per calendar day at 09:00 in `DIGEST_TZ` (default Asia/Kolkata).
 * Set `DISABLE_DIGEST_CRON=true` to skip (e.g. some test environments).
 */
@Injectable()
export class NotificationsDigestScheduler {
  private readonly logger = new Logger(NotificationsDigestScheduler.name);

  constructor(private readonly notifications: NotificationsService) {}

  @Cron('0 9 * * *', {
    timeZone: process.env.DIGEST_TZ || 'Asia/Kolkata',
  })
  async runDailyDigest(): Promise<void> {
    if (process.env.DISABLE_DIGEST_CRON === 'true') {
      return;
    }
    try {
      const r = await this.notifications.sendDailyDigestSummaries();
      this.logger.log(
        `Daily digest cron: usersChecked=${r.usersConsidered} digestsSent=${r.digestsSent} whatsappDigestSent=${r.whatsappDigestSent}`,
      );
    } catch (err) {
      this.logger.error('Daily digest cron failed', err);
    }
  }
}
