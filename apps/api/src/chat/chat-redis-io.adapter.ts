import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server } from 'socket.io';

/**
 * Socket.io with optional Redis adapter when REDIS_URL is set.
 * Falls back to default in-memory adapter if Redis is unavailable.
 */
export class ChatRedisIoAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: Record<string, unknown>): Server {
    const server = super.createIOServer(port, options) as Server;
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      return server;
    }
    try {
      const pubClient = new Redis(url);
      const subClient = pubClient.duplicate();
      server.adapter(createAdapter(pubClient, subClient));
      // eslint-disable-next-line no-console
      console.log('[Chat] Socket.io Redis adapter enabled');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[Chat] Redis adapter failed; using in-memory adapter.',
        err,
      );
    }
    return server;
  }
}
