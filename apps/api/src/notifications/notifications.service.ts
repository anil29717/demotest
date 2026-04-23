import { Injectable } from '@nestjs/common';
import { Property, Requirement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyMatch(property: Property, req: Requirement, score: number, hot: boolean) {
    const title = hot ? 'Hot match on your listing' : 'New match';
    const body = `Score ${score}% — requirement in ${req.city}`;

    const targets = new Set<string>();
    targets.add(property.postedById);
    targets.add(req.userId);

    for (const userId of targets) {
      await this.prisma.notification.create({
        data: {
          userId,
          channel: 'in_app',
          title,
          body,
        },
      });
    }
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async digestPreview(userId: string) {
    const recent = await this.prisma.notification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return {
      windowLocal: '09:30',
      channel: 'whatsapp_stub',
      items: recent.map((n) => ({ title: n.title, body: n.body })),
      note: 'Production: cron batches unread into digest respecting notificationPrefs',
    };
  }
}
