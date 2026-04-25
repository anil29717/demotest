import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DealType, Prisma, PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SearchPropertiesQueryDto } from './dto/search-properties-query.dto';
import {
  escapeForWildcard,
  PropertySearchIndexService,
} from './property-search-index.service';

export type PropertySearchFilters = {
  q?: string;
  city?: string;
  propertyType?: PropertyType;
  dealType?: DealType;
  minPrice?: number;
  maxPrice?: number;
  minAreaSqft?: number;
  maxAreaSqft?: number;
  isBankAuction?: boolean;
  distressedLabel?: string;
};

const PROPERTY_TYPE_VALUES = new Set<string>(Object.values(PropertyType));
const DEAL_TYPE_VALUES = new Set<string>(Object.values(DealType));

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse saved-search JSON into filters (tolerates string numbers from JSON). */
export function parsePropertySearchFilters(
  input: unknown,
): PropertySearchFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const o = input as Record<string, unknown>;
  const out: PropertySearchFilters = {};
  if (typeof o.q === 'string') out.q = o.q;
  if (typeof o.city === 'string') out.city = o.city;
  if (
    typeof o.propertyType === 'string' &&
    PROPERTY_TYPE_VALUES.has(o.propertyType)
  ) {
    out.propertyType = o.propertyType as PropertyType;
  }
  if (typeof o.dealType === 'string' && DEAL_TYPE_VALUES.has(o.dealType)) {
    out.dealType = o.dealType as DealType;
  }
  const minP = num(o.minPrice);
  const maxP = num(o.maxPrice);
  const minA = num(o.minAreaSqft);
  const maxA = num(o.maxAreaSqft);
  if (minP !== undefined) out.minPrice = minP;
  if (maxP !== undefined) out.maxPrice = maxP;
  if (minA !== undefined) out.minAreaSqft = minA;
  if (maxA !== undefined) out.maxAreaSqft = maxA;
  if (o.isBankAuction === true || o.isBankAuction === false) {
    out.isBankAuction = o.isBankAuction;
  } else if (o.isBankAuction === 'true') {
    out.isBankAuction = true;
  } else if (o.isBankAuction === 'false') {
    out.isBankAuction = false;
  }
  if (typeof o.distressedLabel === 'string' && o.distressedLabel.trim()) {
    out.distressedLabel = o.distressedLabel.trim();
  }
  return out;
}

function queryDtoToFilters(
  dto: SearchPropertiesQueryDto,
): PropertySearchFilters {
  return {
    q: dto.q,
    city: dto.city,
    propertyType: dto.propertyType,
    dealType: dto.dealType,
    minPrice: dto.minPrice,
    maxPrice: dto.maxPrice,
    minAreaSqft: dto.minAreaSqft,
    maxAreaSqft: dto.maxAreaSqft,
    isBankAuction: dto.isBankAuction,
    distressedLabel: dto.distressedLabel?.trim() || undefined,
  };
}

function hasStructuredFilter(f: PropertySearchFilters): boolean {
  return !!(
    (f.city && f.city.trim()) ||
    f.propertyType ||
    f.dealType ||
    f.minPrice != null ||
    f.maxPrice != null ||
    f.minAreaSqft != null ||
    f.maxAreaSqft != null ||
    f.isBankAuction === true ||
    f.isBankAuction === false ||
    (f.distressedLabel && f.distressedLabel.length > 0)
  );
}

function hasTextQuery(f: PropertySearchFilters): boolean {
  return Boolean((f.q ?? '').trim());
}

/**
 * Phase 1: PostgreSQL `contains` fallback. Phase 2: optional Elasticsearch when `ELASTICSEARCH_URL` is set.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly propertySearchIndex: PropertySearchIndexService,
  ) {}

  async searchPropertiesQuery(dto: SearchPropertiesQueryDto) {
    return this.executePropertySearch(queryDtoToFilters(dto));
  }

  async runSavedSearch(userId: string, savedId: string) {
    const row = await this.prisma.savedSearch.findFirst({
      where: { id: savedId, userId },
    });
    if (!row) {
      throw new NotFoundException('Saved search not found');
    }
    const filters = parsePropertySearchFilters(row.filters);
    if (!hasTextQuery(filters) && !hasStructuredFilter(filters)) {
      throw new BadRequestException('Saved search has no runnable filters');
    }
    return this.executePropertySearch(filters);
  }

  private buildWhere(
    filters: PropertySearchFilters,
  ): Prisma.PropertyWhereInput {
    const trimmed = (filters.q ?? '').trim();
    const and: Prisma.PropertyWhereInput[] = [];

    if (filters.city?.trim()) {
      and.push({
        city: { contains: filters.city.trim(), mode: 'insensitive' },
      });
    }
    if (filters.propertyType) {
      and.push({ propertyType: filters.propertyType });
    }
    if (filters.dealType) {
      and.push({ dealType: filters.dealType });
    }
    const priceCond: { gte?: number; lte?: number } = {};
    if (filters.minPrice != null) {
      priceCond.gte = filters.minPrice;
    }
    if (filters.maxPrice != null) {
      priceCond.lte = filters.maxPrice;
    }
    if (Object.keys(priceCond).length) {
      and.push({ price: priceCond });
    }
    const areaCond: Prisma.FloatFilter = {};
    if (filters.minAreaSqft != null) {
      areaCond.gte = filters.minAreaSqft;
    }
    if (filters.maxAreaSqft != null) {
      areaCond.lte = filters.maxAreaSqft;
    }
    if (Object.keys(areaCond).length) {
      and.push({ areaSqft: areaCond });
    }
    if (filters.isBankAuction === true || filters.isBankAuction === false) {
      and.push({ isBankAuction: filters.isBankAuction });
    }
    if (filters.distressedLabel) {
      and.push({ distressedLabel: filters.distressedLabel });
    }
    if (trimmed) {
      and.push({
        OR: [
          { title: { contains: trimmed, mode: 'insensitive' } },
          { city: { contains: trimmed, mode: 'insensitive' } },
          { localityPublic: { contains: trimmed, mode: 'insensitive' } },
        ],
      });
    }

    return {
      status: 'active',
      ...(and.length ? { AND: and } : {}),
    };
  }

  private buildElasticsearchBoolQuery(
    filters: PropertySearchFilters,
  ): Record<string, unknown> {
    const must: Record<string, unknown>[] = [{ term: { status: 'active' } }];
    if (filters.city?.trim()) {
      const esc = escapeForWildcard(filters.city.trim().toLowerCase());
      must.push({
        wildcard: {
          cityLower: {
            value: `*${esc}*`,
            case_insensitive: true,
          },
        },
      });
    }
    if (filters.propertyType) {
      must.push({ term: { propertyType: filters.propertyType } });
    }
    if (filters.dealType) {
      must.push({ term: { dealType: filters.dealType } });
    }
    if (filters.minPrice != null || filters.maxPrice != null) {
      const range: { gte?: number; lte?: number } = {};
      if (filters.minPrice != null) {
        range.gte = filters.minPrice;
      }
      if (filters.maxPrice != null) {
        range.lte = filters.maxPrice;
      }
      must.push({ range: { price: range } });
    }
    if (filters.minAreaSqft != null || filters.maxAreaSqft != null) {
      const range: { gte?: number; lte?: number } = {};
      if (filters.minAreaSqft != null) {
        range.gte = filters.minAreaSqft;
      }
      if (filters.maxAreaSqft != null) {
        range.lte = filters.maxAreaSqft;
      }
      must.push({ range: { areaSqft: range } });
    }
    if (filters.isBankAuction === true || filters.isBankAuction === false) {
      must.push({ term: { isBankAuction: filters.isBankAuction } });
    }
    if (filters.distressedLabel) {
      must.push({ term: { distressedLabel: filters.distressedLabel } });
    }
    const trimmed = (filters.q ?? '').trim();
    if (trimmed) {
      must.push({
        bool: {
          should: [
            { match: { title: { query: trimmed, operator: 'and' } } },
            { match: { city: { query: trimmed, operator: 'and' } } },
            {
              match: {
                localityPublic: { query: trimmed, operator: 'and' },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }
    return { bool: { must } };
  }

  private async executePropertySearch(filters: PropertySearchFilters) {
    const esConfigured = Boolean(
      this.config.get<string>('ELASTICSEARCH_URL')?.trim(),
    );
    const started = Date.now();
    this.logger.debug(
      `Search filters=${JSON.stringify(filters)} ES=${esConfigured ? 'configured' : 'unset'}`,
    );

    if (!hasTextQuery(filters) && !hasStructuredFilter(filters)) {
      return {
        hits: [] as {
          id: string;
          title: string;
          city: string;
          price: unknown;
          areaSqft: number;
        }[],
        tookMs: 0,
        note: 'Enter a search query or choose at least one filter.',
      };
    }

    if (this.propertySearchIndex.isEnabled()) {
      const client = this.propertySearchIndex.getClient();
      if (client) {
        try {
          await this.propertySearchIndex.ensureIndex();
          const index = this.propertySearchIndex.getIndexName();
          const res = await client.search({
            index,
            query: this.buildElasticsearchBoolQuery(filters),
            size: 24,
            sort: [{ createdAt: 'desc' }],
            _source: ['id', 'title', 'city', 'price', 'areaSqft'],
          });
          const tookMs =
            typeof res.took === 'number' ? res.took : Date.now() - started;
          const hits = (res.hits.hits ?? []).map((h) => {
            const src = (h._source ?? {}) as Record<string, unknown>;
            const title =
              typeof src.title === 'string' || typeof src.title === 'number'
                ? String(src.title)
                : '';
            const city =
              typeof src.city === 'string' || typeof src.city === 'number'
                ? String(src.city)
                : '';
            return {
              id: typeof src.id === 'string' ? src.id : String(h._id ?? ''),
              title,
              city,
              price: src.price ?? null,
              areaSqft: Number(src.areaSqft ?? 0),
            };
          });
          return {
            hits,
            tookMs,
            note: `Elasticsearch (index ${index}). Token/wildcard behavior may differ slightly from PostgreSQL.`,
          };
        } catch (err) {
          this.logger.warn(
            'Elasticsearch search failed; using PostgreSQL.',
            err,
          );
        }
      }
    }

    const where = this.buildWhere(filters);
    const rows = await this.prisma.property.findMany({
      where,
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
    const tookMs = Date.now() - started;
    const note = esConfigured
      ? 'PostgreSQL fallback (Elasticsearch error or unreachable).'
      : 'PostgreSQL text + filters. Set ELASTICSEARCH_URL for ES-backed search.';
    return { hits, tookMs, note };
  }

  async adminReindexElasticsearch(): Promise<{ indexed: number }> {
    if (!this.propertySearchIndex.isEnabled()) {
      throw new BadRequestException(
        'ELASTICSEARCH_URL is not set; configure Elasticsearch before reindexing.',
      );
    }
    return this.propertySearchIndex.reindexAll();
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
    const res = await this.prisma.savedSearch.deleteMany({
      where: { id, userId },
    });
    return { deleted: res.count > 0 } as const;
  }
}
