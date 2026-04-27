import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { Server } from 'socket.io';

/**
 * Shared options so the adapter never trips ioredis MaxRetriesPerRequestError when Redis
 * is down or flaky (default retry limit is 20 per queued command).
 * @see https://socket.io/docs/v4/redis-adapter/
 */
function socketIoRedisOptions(): RedisOptions {
  return {
    // Fail fast instead of building up queued commands during disconnects.
    enableOfflineQueue: false,
    autoResubscribe: false,
    autoResendUnfulfilledCommands: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  };
}

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

    let pubClient: Redis | undefined;
    let subClient: Redis | undefined;

    try {
      pubClient = new Redis(url, socketIoRedisOptions());
      subClient = pubClient.duplicate();

      const logRedisErr = (label: string, err: unknown) => {
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        // eslint-disable-next-line no-console
        console.warn(`[Chat] Redis ${label}: ${msg}`);
      };
      pubClient.on('connect', () => console.log('[Chat] Redis pub: connected'));
      subClient.on('connect', () => console.log('[Chat] Redis sub: connected'));
      pubClient.on('error', (err) => logRedisErr('pub', err));
      subClient.on('error', (err) => logRedisErr('sub', err));
      pubClient.on('end', () => console.warn('[Chat] Redis pub: disconnected'));
      subClient.on('end', () => console.warn('[Chat] Redis sub: disconnected'));
      pubClient.on('close', () => console.warn('[Chat] Redis pub: closed'));
      subClient.on('close', () => console.warn('[Chat] Redis sub: closed'));

      void Promise.all([pubClient.connect(), subClient.connect()])
        .then(() => {
          server.adapter(createAdapter(pubClient!, subClient!));
          // eslint-disable-next-line no-console
          console.log('[Chat] Socket.io Redis adapter enabled');
        })
        .catch((err) => {
          logRedisErr('connect', err);
          void pubClient?.disconnect();
          void subClient?.disconnect();
          // eslint-disable-next-line no-console
          console.warn('[Chat] Redis unavailable; using in-memory adapter.');
        });
    } catch (err) {
      void pubClient?.disconnect();
      void subClient?.disconnect();
      // eslint-disable-next-line no-console
      console.warn(
        '[Chat] Redis adapter failed; using in-memory adapter.',
        err,
      );
    }

    return server;
  }
}
