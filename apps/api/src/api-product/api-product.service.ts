import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ApiProductService {
  constructor(private readonly prisma: PrismaService) {}

  private hashKey(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private buildKeyPrefix(raw: string) {
    return raw.slice(0, 10);
  }

  async createKey(userId: string, params: { name: string; plan?: string; expiresAt?: Date }) {
    const raw = `arbw_${randomBytes(24).toString('hex')}`;
    const keyHash = this.hashKey(raw);
    const keyPrefix = this.buildKeyPrefix(raw);
    const plan = (params.plan ?? 'FREE').toUpperCase();
    const limits =
      plan === 'PRO'
        ? { callsPerDay: 5000, callsPerMonth: 150000 }
        : plan === 'BUSINESS'
          ? { callsPerDay: 20000, callsPerMonth: 500000 }
          : { callsPerDay: 1000, callsPerMonth: 30000 };
    const row = await this.prisma.apiKey.create({
      data: {
        userId,
        name: params.name,
        plan,
        keyHash,
        keyPrefix,
        expiresAt: params.expiresAt,
        ...limits,
      },
    });
    return { ...row, secret: raw };
  }

  async listMine(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        plan: true,
        keyPrefix: true,
        isActive: true,
        callsPerDay: true,
        callsPerMonth: true,
        totalCalls: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async revokeKey(userId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id }, select: { userId: true } });
    if (!key || key.userId !== userId) throw new UnauthorizedException('API key not found');
    await this.prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  async validateAndConsume(rawKey: string) {
    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        userId: true,
        isActive: true,
        callsPerDay: true,
        callsPerMonth: true,
        expiresAt: true,
      },
    });
    if (!apiKey || !apiKey.isActive) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [dayCount, monthCount] = await Promise.all([
      this.prisma.apiUsage.count({ where: { apiKeyId: apiKey.id, createdAt: { gte: dayStart } } }),
      this.prisma.apiUsage.count({ where: { apiKeyId: apiKey.id, createdAt: { gte: monthStart } } }),
    ]);
    if (dayCount >= apiKey.callsPerDay || monthCount >= apiKey.callsPerMonth) return null;
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: now, totalCalls: { increment: 1 } },
    });
    return { id: apiKey.id, userId: apiKey.userId };
  }

  async recordUsage(input: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    responseTimeMs: number;
  }) {
    return this.prisma.apiUsage.create({ data: input });
  }

  async adminStats() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now);
    monthStart.setDate(1);

    const [today, week, month, usageRows, topKeys] = await Promise.all([
      this.prisma.apiUsage.count({ where: { createdAt: { gte: dayStart } } }),
      this.prisma.apiUsage.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.apiUsage.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.apiUsage.findMany({
        where: { createdAt: { gte: monthStart } },
        select: { endpoint: true, responseStatus: true, responseTimeMs: true },
      }),
      this.prisma.apiKey.findMany({
        orderBy: { totalCalls: 'desc' },
        take: 10,
        select: {
          keyPrefix: true,
          totalCalls: true,
          lastUsedAt: true,
          user: { select: { name: true } },
        },
      }),
    ]);
    const endpointMap = new Map<string, { count: number; totalMs: number }>();
    let errorCount = 0;
    let totalMs = 0;
    for (const row of usageRows) {
      totalMs += row.responseTimeMs;
      if (row.responseStatus >= 400) errorCount += 1;
      const curr = endpointMap.get(row.endpoint) ?? { count: 0, totalMs: 0 };
      curr.count += 1;
      curr.totalMs += row.responseTimeMs;
      endpointMap.set(row.endpoint, curr);
    }
    const endpointRows = [...endpointMap.entries()].map(([endpoint, v]) => ({
      endpoint,
      count: v.count,
      avgResponseTime: Math.round(v.totalMs / Math.max(1, v.count)),
    }));
    endpointRows.sort((a, b) => b.count - a.count);
    const slowEndpoints = [...endpointRows]
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5);

    return {
      totalCallsToday: today,
      totalCallsWeek: week,
      totalCallsMonth: month,
      totalRevenue: 0,
      errorRate: usageRows.length ? Number(((errorCount / usageRows.length) * 100).toFixed(2)) : 0,
      avgResponseTime: usageRows.length ? Math.round(totalMs / usageRows.length) : 0,
      topUsers: topKeys.map((k) => ({
        name: k.user.name ?? 'User',
        prefix: k.keyPrefix,
        totalCalls: k.totalCalls,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      })),
      topEndpoints: endpointRows.slice(0, 5),
      slowEndpoints,
    };
  }
}

