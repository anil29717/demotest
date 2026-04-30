import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Prisma, Property, Requirement } from '@prisma/client';
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

  private shouldDeliverType(
    type: NotificationType,
    prefs: ReturnType<typeof normalizeNotificationPrefs>,
  ): boolean {
    switch (type) {
      case NotificationType.MATCH:
        return prefs.matchAlerts;
      case NotificationType.NDA:
        return prefs.ndaAlerts;
      case NotificationType.DEAL:
        return prefs.dealAlerts;
      case NotificationType.ALERT:
        return prefs.alertAlerts;
      default:
        return true;
    }
  }

  private async sendEmailTracked(
    to: string | null | undefined,
    subject: string,
    text: string,
  ): Promise<{ sent: boolean; detail: string }> {
    if (!to) return { sent: false, detail: 'missing_recipient' };
    try {
      const out = await this.emailOutbound.send(to, subject, text);
      return {
        sent: Boolean(out.sent),
        detail: out.detail ?? (out.sent ? 'sent' : 'failed'),
      };
    } catch (err) {
      this.logger.warn(
        `Email outbound failure to=${to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { sent: false, detail: 'exception' };
    }
  }

  /**
   * Create in-app notification when user prefs allow this type.
   * Use `bypassPrefs` only for digest rows (gated by dailyDigest elsewhere).
   */
  async createInApp(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Prisma.InputJsonValue,
    opts?: { bypassPrefs?: boolean },
  ) {
    if (!opts?.bypassPrefs) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPrefs: true },
      });
      const prefs = normalizeNotificationPrefs(user?.notificationPrefs);
      if (!this.shouldDeliverType(type, prefs)) {
        return null;
      }
    }

    return this.prisma.notification.create({
      data: {
        userId,
        channel: 'in_app',
        type,
        title,
        body,
        metadata: metadata ?? undefined,
      },
    });
  }

  async notifyMatch(
    property: Property,
    req: Requirement,
    score: number,
    hot: boolean,
  ) {
    const title = hot ? 'Hot match on your listing' : 'New match';
    const body = `Score ${Math.round(score)}% — requirement in ${req.city}`;
    const metadata = {
      kind: 'match',
      propertyId: property.id,
      requirementId: req.id,
    } satisfies Prisma.InputJsonValue;

    const targets = new Set<string>();
    targets.add(property.postedById);
    targets.add(req.userId);

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...targets] } },
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
      const base = await this.prisma.notification.create({
        data: {
          userId,
          channel: 'in_app',
          type: NotificationType.MATCH,
          title,
          body,
          metadata,
        },
      });
      if (prefs.emailMatchAlerts) {
        const em = emailByUser.get(userId);
        const email = await this.sendEmailTracked(em, title, body);
        await this.prisma.notification.update({
          where: { id: base.id },
          data: {
            metadata: {
              ...(metadata as Record<string, unknown>),
              delivery: { email },
            },
          },
        });
      }
    }
  }

  async notifySavedSearchMatch(userId: string, propertyTitle: string) {
    await this.createInApp(
      userId,
      NotificationType.MATCH,
      'Saved search match',
      `A new listing matches your saved search (“${propertyTitle.slice(0, 80)}”).`,
      { kind: 'saved_search' },
    );
  }

  async notifyNdaDecision(params: {
    userId: string;
    status: 'APPROVED' | 'REJECTED';
    institutionSummary: string;
    institutionId: string;
    reviewNote?: string | null;
  }) {
    const title =
      params.status === 'APPROVED'
        ? 'NDA approved — access unlocked'
        : 'NDA request declined';
    const body =
      params.status === 'APPROVED'
        ? `You can view confidential details for ${params.institutionSummary}.`
        : `Your confidentiality request for ${params.institutionSummary} was declined.${params.reviewNote ? ` ${params.reviewNote}` : ''}`;
    await this.createInApp(
      params.userId,
      NotificationType.NDA,
      title,
      body,
      {
        institutionId: params.institutionId,
        status: params.status,
      },
    );
  }

  async notifyDealStageChange(params: {
    userId: string;
    dealId: string;
    assetLabel: string;
    fromStage: string;
    toStage: string;
  }) {
    await this.createInApp(
      params.userId,
      NotificationType.DEAL,
      'Pipeline stage updated',
      `${params.assetLabel}: ${params.fromStage} → ${params.toStage}`,
      { dealId: params.dealId, from: params.fromStage, to: params.toStage },
    );
  }

  async notifySlaWarning(params: {
    userId: string;
    dealId: string;
    elapsedHours: number;
  }) {
    await this.createInApp(
      params.userId,
      NotificationType.ALERT,
      'SLA warning',
      `Deal ${params.dealId.slice(0, 8)}… exceeded stage SLA (${params.elapsedHours.toFixed(1)}h).`,
      { dealId: params.dealId },
    );
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

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
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
      const digestRow = await this.prisma.notification.create({
        data: {
          userId: u.id,
          channel: 'in_app',
          type: NotificationType.ALERT,
          title: DAILY_DIGEST_TITLE,
          body: digestBody,
          metadata: { delivery: { whatsapp: null, email: null } },
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
        await this.prisma.notification.update({
          where: { id: digestRow.id },
          data: {
            metadata: {
              delivery: {
                whatsapp: {
                  sent: wa.sent,
                  detail: wa.detail ?? (wa.sent ? 'sent' : 'failed'),
                },
              },
            },
          },
        });
        if (wa.sent) {
          whatsappDigestSent++;
        } else {
          this.logger.warn(
            `WhatsApp digest failed for user ${u.id}: ${wa.detail ?? 'unknown'}`,
          );
        }
      }

      if (prefs.emailDailyDigest && u.email) {
        const email = await this.sendEmailTracked(
          u.email,
          'AR Buildwel — Daily digest',
          digestBody,
        );
        await this.prisma.notification.update({
          where: { id: digestRow.id },
          data: {
            metadata: {
              delivery: {
                email,
              },
            },
          },
        });
      }
    }
    return {
      usersConsidered: users.length,
      digestsSent,
      whatsappDigestSent,
    };
  }
}
