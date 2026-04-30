import {
  forwardRef,
  Inject,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ChatMessageType } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (
      process.env.SOCKET_CORS_ORIGIN ??
      process.env.CORS_ORIGIN ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.FRONTEND_URL ??
      'http://localhost:3000'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
    private readonly config: ConfigService,
  ) {}

  private verifyClient(client: Socket): { sub: string } {
    const raw =
      (client.handshake.auth?.token as string | undefined) ??
      (typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);
    if (!raw?.trim()) {
      throw new UnauthorizedException('Missing token');
    }
    try {
      const secret = this.config.get<string>('JWT_SECRET', 'dev-secret-change-me');
      return this.jwt.verify<{ sub: string }>(raw.trim(), { secret });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  handleConnection(client: Socket) {
    try {
      const payload = this.verifyClient(client);
      const userId = payload.sub;
      (client.data as { userId?: string }).userId = userId;
      void client.join(`user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const uid = (client.data as { userId?: string }).userId;
    this.logger.debug(`Chat socket disconnect user=${uid ?? 'unknown'}`);
  }

  emitToThread(threadId: string, event: string, data: unknown) {
    if (!this.server) return;
    this.server.to(`thread:${threadId}`).emit(event, data);
  }

  async isUserInThreadRoom(threadId: string, userId: string): Promise<boolean> {
    if (!this.server) return false;
    try {
      const sockets = await this.server.in(`thread:${threadId}`).fetchSockets();
      return sockets.some(
        (s) => (s.data as { userId?: string }).userId === userId,
      );
    } catch {
      return false;
    }
  }

  /** User joined `user:${userId}` on socket connect — used for presence in chat UI. */
  async isUserOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    try {
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      return sockets.length > 0;
    } catch {
      return false;
    }
  }

  @SubscribeMessage('joinThread')
  async handleJoinThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) return { event: 'error', message: 'Unauthorized' };
    try {
      await this.chat.getThreadMessages(data.threadId, userId, { limit: 1 });
    } catch {
      client.emit('error', { message: 'Cannot join thread' });
      return { event: 'error', message: 'Forbidden' };
    }
    await client.join(`thread:${data.threadId}`);
    client.emit('joined', { threadId: data.threadId });
    try {
      await this.chat.markAsRead(data.threadId, userId);
    } catch (e) {
      this.logger.warn('markAsRead on join failed', e);
    }
    return { event: 'joined', threadId: data.threadId };
  }

  @SubscribeMessage('leaveThread')
  async handleLeaveThread(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(`thread:${data.threadId}`);
    return { event: 'left', threadId: data.threadId };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody()
    data: { threadId: string; content: string; type?: ChatMessageType },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) return { event: 'error', message: 'Unauthorized' };
    const type = data.type ?? ChatMessageType.TEXT;
    const msg = await this.chat.sendMessage(
      data.threadId,
      userId,
      data.content ?? '',
      type,
    );
    return { event: 'newMessage', message: msg };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { threadId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId || !data.threadId) return;
    client
      .to(`thread:${data.threadId}`)
      .emit('userTyping', { userId, isTyping: data.isTyping });
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @MessageBody() data: { threadId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = (client.data as { userId?: string }).userId;
    if (!userId) return { event: 'error', message: 'Unauthorized' };
    await this.chat.markAsRead(data.threadId, userId);
    return { event: 'readReceipt', threadId: data.threadId, userId };
  }
}
