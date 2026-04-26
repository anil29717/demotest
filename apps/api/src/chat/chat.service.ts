import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChatMessageType,
  ChatThreadType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

const SYSTEM_SENDER = 'system';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly gateway: ChatGateway,
  ) {}

  private serializeMessage(m: {
    id: string;
    threadId: string;
    senderId: string;
    content: string;
    messageType: ChatMessageType;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    readBy: string[];
    editedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
  }) {
    const deleted = Boolean(m.deletedAt);
    return {
      id: m.id,
      threadId: m.threadId,
      senderId: m.senderId,
      content: deleted ? '' : m.content,
      messageType: m.messageType,
      fileUrl: deleted ? null : m.fileUrl,
      fileName: deleted ? null : m.fileName,
      fileSize: deleted ? null : m.fileSize,
      readBy: m.readBy,
      editedAt: m.editedAt,
      deletedAt: m.deletedAt,
      createdAt: m.createdAt,
      deleted,
      placeholder: deleted ? 'Message deleted' : undefined,
    };
  }

  async resolveDealParticipantIds(dealId: string): Promise<string[]> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        requirement: { select: { userId: true } },
        property: { select: { postedById: true } },
        institution: { select: { postedById: true } },
      },
    });
    if (!deal) return [];
    const buyer = deal.requirement.userId;
    const seller =
      deal.property?.postedById ?? deal.institution?.postedById ?? null;
    const brokers = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: deal.organizationId,
        role: { in: ['ADMIN', 'AGENT'] },
      },
      select: { userId: true },
    });
    const ids = new Set<string>([buyer, ...brokers.map((b) => b.userId)]);
    if (seller) ids.add(seller);
    return [...ids];
  }

  private assertParticipant(thread: { participants: string[] }, userId: string) {
    if (!thread.participants.includes(userId)) {
      throw new ForbiddenException('Not a participant in this thread');
    }
  }

  async getOrCreateDealThread(dealId: string, currentUserId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        property: { select: { title: true } },
        institution: { select: { institutionName: true } },
      },
    });
    if (!deal) throw new NotFoundException('Deal not found');

    const participants = await this.resolveDealParticipantIds(dealId);
    if (!participants.includes(currentUserId)) {
      throw new ForbiddenException('No access to this deal chat');
    }

    const title =
      deal.property?.title ??
      deal.institution?.institutionName ??
      `Deal ${dealId.slice(0, 8)}`;

    let thread = await this.prisma.chatThread.findUnique({
      where: { dealId },
        include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!thread) {
      thread = await this.prisma.chatThread.create({
        data: {
          dealId,
          threadType: ChatThreadType.DEAL,
          participants,
          title,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
    } else if (
      participants.some((p) => !thread!.participants.includes(p))
    ) {
      thread = await this.prisma.chatThread.update({
        where: { id: thread.id },
        data: { participants: [...new Set([...thread.participants, ...participants])] },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
    }

    const messagesAsc = [...thread.messages].reverse().map((m) => this.serializeMessage(m));
    return {
      thread: {
        id: thread.id,
        dealId: thread.dealId,
        threadType: thread.threadType,
        participants: thread.participants,
        title: thread.title,
        lastMessageAt: thread.lastMessageAt,
        createdAt: thread.createdAt,
      },
      messages: messagesAsc,
    };
  }

  async getOrCreateDirectThread(userIdA: string, userIdB: string) {
    if (userIdA === userIdB) {
      throw new ForbiddenException('Cannot start a chat with yourself');
    }
    const pair = [userIdA, userIdB].sort();
    const candidates = await this.prisma.chatThread.findMany({
      where: {
        threadType: ChatThreadType.DIRECT,
        participants: { hasEvery: pair },
      },
    });
    const thread =
      candidates.find((t) => t.participants.length === 2) ??
      (await this.prisma.chatThread.create({
        data: {
          threadType: ChatThreadType.DIRECT,
          participants: pair,
          title: null,
        },
      }));

    const full = await this.prisma.chatThread.findUniqueOrThrow({
      where: { id: thread.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    const messagesAsc = [...full.messages].reverse().map((m) => this.serializeMessage(m));
    return {
      thread: {
        id: full.id,
        dealId: full.dealId,
        threadType: full.threadType,
        participants: full.participants,
        title: full.title,
        lastMessageAt: full.lastMessageAt,
        createdAt: full.createdAt,
      },
      messages: messagesAsc,
    };
  }

  async getThreadMessages(
    threadId: string,
    userId: string,
    opts: { cursor?: string; limit?: number },
  ) {
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    this.assertParticipant(thread, userId);

    let cursorCreated: Date | undefined;
    let cursorId: string | undefined;
    if (opts.cursor) {
      const c = await this.prisma.chatMessage.findFirst({
        where: { id: opts.cursor, threadId },
      });
      if (c) {
        cursorCreated = c.createdAt;
        cursorId = c.id;
      }
    }

    const where: Prisma.ChatMessageWhereInput = {
      threadId,
      ...(cursorCreated && cursorId
        ? {
            OR: [
              { createdAt: { lt: cursorCreated } },
              {
                AND: [
                  { createdAt: cursorCreated },
                  { id: { lt: cursorId } },
                ],
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.chatMessage.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const ordered = [...page].reverse();
    return {
      messages: ordered.map((m) => this.serializeMessage(m)),
      nextCursor: hasMore ? page[limit - 1]?.id : undefined,
    };
  }

  async sendMessage(
    threadId: string,
    senderId: string,
    content: string,
    type: ChatMessageType = ChatMessageType.TEXT,
    file?: { fileUrl: string; fileName: string; fileSize: number },
  ) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    this.assertParticipant(thread, senderId);

    const msg = await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderId,
        content: content ?? '',
        messageType: type,
        fileUrl: file?.fileUrl,
        fileName: file?.fileName,
        fileSize: file?.fileSize,
        readBy: [senderId],
      },
    });
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    const payload = this.serializeMessage(msg);
    this.gateway.emitToThread(threadId, 'newMessage', payload);

    const others = thread.participants.filter((p) => p !== senderId);
    for (const uid of others) {
      const inRoom = await this.gateway.isUserInThreadRoom(threadId, uid);
      if (!inRoom) {
        try {
          await this.prisma.notification.create({
            data: {
              userId: uid,
              channel: 'in_app',
              title: 'New chat message',
              body:
                content.slice(0, 120) ||
                (file?.fileName ? `Attachment: ${file.fileName}` : 'New message'),
            },
          });
        } catch (e) {
          this.logger.warn(`Chat notification failed for ${uid}`, e);
        }
      }
    }

    return payload;
  }

  async markAsRead(threadId: string, userId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    this.assertParticipant(thread, userId);

    await this.prisma.$executeRaw`
      UPDATE "ChatMessage"
      SET "readBy" = array_append("readBy", ${userId}::text)
      WHERE "threadId" = ${threadId}
        AND "deletedAt" IS NULL
        AND NOT (${userId}::text = ANY("readBy"))
    `;

    const readAt = new Date();
    this.gateway.emitToThread(threadId, 'readReceipt', {
      threadId,
      userId,
      readAt: readAt.toISOString(),
    });
  }

  async getUserThreads(userId: string) {
    const threads = await this.prisma.chatThread.findMany({
      where: { participants: { has: userId } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        deal: {
          select: {
            id: true,
            property: { select: { id: true, title: true } },
            institution: { select: { id: true, institutionName: true } },
          },
        },
      },
    });

    const otherIds = new Set<string>();
    for (const t of threads) {
      for (const p of t.participants) {
        if (p !== userId && p !== SYSTEM_SENDER) otherIds.add(p);
      }
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...otherIds] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name ?? '']));

    const out = [];
    for (const t of threads) {
      const last = t.messages[0];
      const previewSource = last?.deletedAt
        ? 'Message deleted'
        : last?.messageType === ChatMessageType.SYSTEM
          ? last.content
          : last?.messageType === ChatMessageType.FILE ||
              last?.messageType === ChatMessageType.IMAGE
            ? last.fileName ?? 'Attachment'
            : (last?.content ?? '');
      const preview =
        previewSource.length > 60
          ? `${previewSource.slice(0, 60)}…`
          : previewSource;

      const unread = await this.prisma.chatMessage.count({
        where: {
          threadId: t.id,
          deletedAt: null,
          senderId: { not: userId },
          NOT: { readBy: { has: userId } },
        },
      });

      const others = t.participants.filter((p) => p !== userId && p !== SYSTEM_SENDER);
      const displayTitle =
        t.title ??
        (others.length === 1
          ? nameById.get(others[0]) || others[0]
          : others.map((o) => nameById.get(o) || o).join(', '));

      out.push({
        id: t.id,
        dealId: t.dealId,
        threadType: t.threadType,
        title: displayTitle,
        lastMessagePreview: preview,
        lastMessageAt: t.lastMessageAt,
        unreadCount: unread,
        propertyId: t.deal?.property?.id ?? null,
        dealIdForLink: t.deal?.id ?? null,
      });
    }
    return out;
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) {
      throw new ForbiddenException('Only the author can delete this message');
    }
    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    const payload = this.serializeMessage(updated);
    this.gateway.emitToThread(msg.threadId, 'message_deleted', {
      messageId,
      threadId: msg.threadId,
    });
    return payload;
  }

  async createSystemMessage(threadId: string, content: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) return null;
    const msg = await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderId: SYSTEM_SENDER,
        content,
        messageType: ChatMessageType.SYSTEM,
        readBy: [],
      },
    });
    await this.prisma.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });
    const payload = this.serializeMessage(msg);
    this.gateway.emitToThread(threadId, 'newMessage', payload);
    return payload;
  }

  async createSystemMessageForDeal(dealId: string, content: string) {
    try {
      const thread = await this.prisma.chatThread.findUnique({
        where: { dealId },
      });
      if (!thread) return;
      await this.createSystemMessage(thread.id, content);
    } catch (e) {
      this.logger.warn(`createSystemMessageForDeal ${dealId}`, e);
    }
  }

  async createFileMessage(
    threadId: string,
    senderId: string,
    fileUrl: string,
    fileName: string,
    fileSize: number,
  ) {
    return this.sendMessage(threadId, senderId, '', ChatMessageType.FILE, {
      fileUrl,
      fileName,
      fileSize,
    });
  }

  maxFileBytes(): number {
    const mb = Number(
      this.config.get<string>('CHAT_MAX_FILE_SIZE_MB') ?? '10',
    );
    const n = Number.isFinite(mb) && mb > 0 ? mb : 10;
    return Math.round(n * 1024 * 1024);
  }

  async adminGetThreadMessages(threadId: string, limit = 100) {
    const rows = await this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map((m) => this.serializeMessage(m));
  }
}
