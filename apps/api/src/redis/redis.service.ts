import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
    this.client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  }

  get redis(): Redis {
    return this.client;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    if (!v) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSec?: number): Promise<void> {
    const s = JSON.stringify(value);
    if (ttlSec) await this.client.setex(key, ttlSec, s);
    else await this.client.set(key, s);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
