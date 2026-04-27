import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import axios from 'axios';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/crawler')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CrawlerAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('trigger')
  async trigger() {
    const url = process.env.CRAWLER_TRIGGER_URL;
    if (!url) {
      return {
        started: false,
        message:
          'Crawler service not configured yet. Set CRAWLER_TRIGGER_URL to enable remote trigger.',
      };
    }
    const run = await this.prisma.crawlerRun.create({
      data: { source: 'manual', status: 'RUNNING' },
    });
    try {
      await axios.post(url, { runId: run.id }, { timeout: 10_000 });
      return { started: true, runId: run.id };
    } catch (err) {
      await this.prisma.crawlerRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errors: { message: err instanceof Error ? err.message : 'Trigger failed' },
        },
      });
      return { started: false, runId: run.id, message: 'Failed to trigger crawler.' };
    }
  }

  @Get('status')
  async status() {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const [totalImportedAgg, todayImportedAgg, failedRuns, recentRuns] =
      await Promise.all([
        this.prisma.crawlerRun.aggregate({ _sum: { listingsImported: true } }),
        this.prisma.crawlerRun.aggregate({
          where: { createdAt: { gte: dayStart } },
          _sum: { listingsImported: true },
        }),
        this.prisma.crawlerRun.count({ where: { status: 'FAILED' } }),
        this.prisma.crawlerRun.findMany({
          take: 12,
          orderBy: { startedAt: 'desc' },
        }),
      ]);
    const bySourceMap = new Map<string, { source: string; total: number; imported: number }>();
    for (const run of recentRuns) {
      const curr = bySourceMap.get(run.source) ?? {
        source: run.source,
        total: 0,
        imported: 0,
      };
      curr.total += 1;
      curr.imported += run.listingsImported;
      bySourceMap.set(run.source, curr);
    }
    return {
      stats: {
        totalImported: totalImportedAgg._sum.listingsImported ?? 0,
        todayImported: todayImportedAgg._sum.listingsImported ?? 0,
        failedRuns,
        lastRunAt: recentRuns[0]?.startedAt ?? null,
      },
      bySource: [...bySourceMap.values()],
      recentRuns,
      qualityBuckets: [
        { label: '0-25', count: 0 },
        { label: '25-50', count: 0 },
        { label: '50-75', count: 0 },
        { label: '75-100', count: 0 },
      ],
    };
  }
}
