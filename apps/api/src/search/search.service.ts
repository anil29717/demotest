import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 1: PostgreSQL `contains` fallback. Phase 2: optional Elasticsearch when `ELASTICSEARCH_URL` is set.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async searchProperties(q: string) {
    const es = this.config.get<string>('ELASTICSEARCH_URL');
    this.logger.debug(
      `Search q="${q}" ES=${es ? 'configured' : 'unset'} — using Prisma fallback`,
    );
    const trimmed = (q ?? '').trim();
    if (!trimmed) {
      return {
        hits: [] as { id: string; title: string; city: string; price: unknown; areaSqft: number }[],
        tookMs: 0,
        note: 'Enter a query string',
      };
    }
    const rows = await this.prisma.property.findMany({
      where: {
        status: 'active',
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { city: { contains: trimmed, mode: 'insensitive' } },
          { localityPublic: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: 24,
      orderBy: { createdAt: 'desc' },
    });
    const hits = rows.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      price: p.price,
      areaSqft: p.areaSqft,
    }));
    return {
      hits,
      tookMs: 12,
      note: es
        ? 'Prisma fallback active; index sync to Elasticsearch is Phase 2.'
        : 'PostgreSQL text match. Set ELASTICSEARCH_URL for ES-backed search.',
    };
  }

  listSaved(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSaved(userId: string, name: string, filters: object) {
    return this.prisma.savedSearch.create({
      data: { userId, name, filters },
    });
  }

  async deleteSaved(userId: string, id: string) {
    const row = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!row) return { deleted: false as const };
    await this.prisma.savedSearch.delete({ where: { id } });
    return { deleted: true as const };
  }
}
