import { Injectable, Logger } from '@nestjs/common';
import { Property, Requirement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailOutboundService } from './email-outbound.service';
import { WhatsappOutboundService } from '../whatsapp/whatsapp-outbound.service';
import {
  formatDigestWindowLocal,
  normalizeNotificationPrefs,
} from './notification-prefs.util';

/** In-app summary row created by daily digest cron (excluded from unread counts). */
export const DAILY_DIGEST_TITLE = 'Daily digest';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappOutbound: WhatsappOutboundService,
    private readonly emailOutbound: EmailOutboundService,
  ) {}

  async notifyMatch(
    property: Property,
    req: Requirement,
    score: number,
    hot: boolean,
  ) {
    const title = hot ? 'Hot match on your listing' : 'New match';
    const body = `Score ${score}% — requirement in ${req.city}`;

    const targets = new Set<string>();
    targets.add(property.postedById);
    targets.add(req.userId);
    const ids = [...targets];

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, notificationPrefs: true },
    });
    const prefsByUser = new Map(
      users.map((u) => [u.id, normalizeNotificationPrefs(u.notificationPrefs)]),
    );
    const emailByUser = new Map(users.map((u) => [u.id, u.email]));

    for (const userId of targets) {
      const prefs =
        prefsByUser.get(userId) ?? normalizeNotificationPrefs(undefined);
      if (!prefs.matchAlerts) {
        continue;
      }
      await this.prisma.notification.create({
        data: {
          userId,
          channel: 'in_app',
          title,
          body,
        },
      });
      if (prefs.emailMatchAlerts) {
        const em = emailByUser.get(userId);
        if (em) {
          await this.emailOutbound.send(em, title, body);
        }
      }
    }
  }

  async listForUser(userId: string, take = 20, offset = 0) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip: offset,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { data, total, hasMore: offset + data.length < total };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async digestPreview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPrefs: true },
    });
    const prefs = normalizeNotificationPrefs(user?.notificationPrefs);

    if (!prefs.dailyDigest) {
      return {
        windowLocal: 'N/A',
        channel: 'none',
        items: [] as { title: string; body: string }[],
        note: 'Daily digest is turned off in your notification settings.',
      };
    }

    const recent = await this.prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const windowLocal = formatDigestWindowLocal(prefs);
    const waReady =
      this.whatsappOutbound.isConfigured() &&
      prefs.whatsappDigest &&
      Boolean(prefs.whatsappDigestTo);
    return {
      windowLocal,
      channel: waReady ? 'whatsapp_cloud' : 'in_app',
      whatsappDigest: prefs.whatsappDigest,
      whatsappToConfigured: Boolean(prefs.whatsappDigestTo),
      cloudApiConfigured: this.whatsappOutbound.isConfigured(),
      items: recent.map((n) => ({ title: n.title, body: n.body })),
      note: waReady
        ? 'Daily digest cron creates an in-app summary and mirrors a short WhatsApp text when WHATSAPP_CLOUD_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set.'
        : 'Daily in-app digest summary is sent by server cron at 09:00 (DIGEST_TZ). Enable “WhatsApp digest” and add a verified E.164 number to receive a WhatsApp mirror when Cloud API env vars are set.',
    };
  }

  /**
   * Daily digest batch: one in-app summary per eligible user when they have unread
   * (non-digest) notifications and digest prefs are on. Deduped within ~22h.
   * WhatsApp delivery remains a separate worker.
   */
  async sendDailyDigestSummaries(): Promise<{
    usersConsidered: number;
    digestsSent: number;
    whatsappDigestSent: number;
  }> {
    const since = new Date(Date.now() - 22 * 60 * 60 * 1000);
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, notificationPrefs: true },
      take: 5000,
    });
    let digestsSent = 0;
    let whatsappDigestSent = 0;
    for (const u of users) {
      const prefs = normalizeNotificationPrefs(u.notificationPrefs);
      if (!prefs.dailyDigest) {
        continue;
      }
      const recentDigest = await this.prisma.notification.findFirst({
        where: {
          userId: u.id,
          title: DAILY_DIGEST_TITLE,
          createdAt: { gte: since },
        },
      });
      if (recentDigest) {
        continue;
      }
      const unreadCount = await this.prisma.notification.count({
        where: {
          userId: u.id,
          read: false,
          title: { not: DAILY_DIGEST_TITLE },
        },
      });
      if (unreadCount === 0) {
        continue;
      }
      const digestBody = `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}. Open the notifications page to review.`;
      await this.prisma.notification.create({
        data: {
          userId: u.id,
          channel: 'in_app',
          title: DAILY_DIGEST_TITLE,
          body: digestBody,
        },
      });
      digestsSent++;

      if (
        prefs.whatsappDigest &&
        prefs.whatsappDigestTo &&
        this.whatsappOutbound.isConfigured()
      ) {
        const wa = await this.whatsappOutbound.sendTextMessage(
          prefs.whatsappDigestTo,
          `AR Buildwel — Daily digest\n${digestBody}`,
        );
        if (wa.sent) {
          whatsappDigestSent++;
        } else {
          this.logger.warn(
            `WhatsApp digest failed for user ${u.id}: ${wa.detail ?? 'unknown'}`,
          );
        }
      }

      if (prefs.emailDailyDigest && u.email) {
        await this.emailOutbound.send(
          u.email,
          'AR Buildwel — Daily digest',
          digestBody,
        );
      }
    }
    return {
      usersConsidered: users.length,
      digestsSent,
      whatsappDigestSent,
    };
  }
}
