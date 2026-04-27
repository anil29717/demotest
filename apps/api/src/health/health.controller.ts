import { Controller, Get } from '@nestjs/common';
import axios from 'axios';
import { PropertySearchIndexService } from '../search/property-search-index.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly propertySearchIndex: PropertySearchIndexService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms),
      ),
    ]);
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
      return 'connected';
    } catch (e) {
      return `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      if (this.redis.redis.status === 'wait') {
        await this.withTimeout(this.redis.redis.connect());
      }
      const pong = await this.withTimeout(this.redis.redis.ping());
      return pong === 'PONG' ? 'connected' : 'unavailable';
    } catch (e) {
      return `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private async checkElasticsearch(): Promise<string> {
    if (!this.propertySearchIndex.isEnabled()) return 'disabled';
    return (await this.withTimeout(this.propertySearchIndex.ping()))
      ? 'connected'
      : 'unavailable';
  }

  private async checkMlService(): Promise<string> {
    const base = (process.env.ML_SERVICE_URL ?? 'http://localhost:8001').replace(/\/$/, '');
    try {
      const res = await this.withTimeout(axios.get(`${base}/health`, { timeout: 2000 }));
      return res.status >= 200 && res.status < 300 ? 'connected' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }

  @Get('health')
  async health() {
    const [database, redis, elasticsearch, mlService] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkElasticsearch(),
      this.checkMlService(),
    ]);
    const hasDbError = database !== 'connected';
    const hasRedisError = redis !== 'connected';
    const degraded =
      elasticsearch === 'unavailable' || mlService === 'unavailable';
    const status = hasDbError || hasRedisError ? 'error' : degraded ? 'degraded' : 'ok';
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.0.1',
      environment: process.env.NODE_ENV ?? 'development',
      services: {
        database,
        redis,
        elasticsearch,
        mlService,
      },
      configuration: {
        razorpay: Boolean(process.env.RAZORPAY_KEY_ID),
        openai: Boolean(process.env.OPENAI_API_KEY),
        whatsapp: Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN),
        smtp: Boolean(process.env.SMTP_HOST),
      },
    };
  }
}
