import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DealType, Prisma, PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  SearchPropertiesQueryDto,
  SearchSortMode,
} from './dto/search-properties-query.dto';
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
  lat?: number;
  lon?: number;
  radiusKm?: number;
};

export type SearchHitRow = {
  id: string;
  title: string;
  city: string;
  price: unknown;
  areaSqft: number;
  distressedLabel?: string;
  imageUrls?: string[];
  _score?: number;
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
    lat: dto.lat,
    lon: dto.lon,
    radiusKm: dto.radiusKm,
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
    f.lat != null ||
    f.lon != null ||
    f.radiusKm != null ||
    f.isBankAuction === true ||
    f.isBankAuction === false ||
    (f.distressedLabel && f.distressedLabel.length > 0)
  );
}

function hasTextQuery(f: PropertySearchFilters): boolean {
  return Boolean((f.q ?? '').trim());
}

/** Split free-text `q` into tokens; hyphenated words become multiple tokens (e.g. sec-53 → sec, 53). */
function tokenizeSearchQuery(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (tok: string) => {
    const t = tok.trim();
    if (t.length < 2 && !/^\d{2,}$/.test(t)) return;
    if (!t.length) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  for (const word of raw.trim().split(/[\s,]+/)) {
    if (!word) continue;
    if (/-/.test(word)) {
      for (const sub of word.split(/-+/).filter(Boolean)) push(sub);
    } else {
      push(word);
    }
  }
  return out;
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
    private readonly notifications: NotificationsService,
  ) {}

  async searchPropertiesQuery(dto: SearchPropertiesQueryDto) {
    return this.executePropertySearch(queryDtoToFilters(dto), {
      page: dto.page ?? 1,
      limit: Math.min(Math.max(dto.limit ?? 20, 1), 100),
      sort: dto.sort ?? 'relevance',
    });
  }

  async runSavedSearch(
    userId: string,
    savedId: string,
    opts?: { page?: number; limit?: number; sort?: SearchSortMode },
  ) {
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
    return this.executePropertySearch(filters, {
      page: opts?.page ?? 1,
      limit: Math.min(Math.max(opts?.limit ?? 20, 1), 100),
      sort: opts?.sort ?? 'relevance',
    });
  }

  /** Non-blocking: notify owners of saved searches that match a newly listed property. */
  async notifyInstantSavedSearchMatches(propertyId: string): Promise<void> {
    try {
      const property = await this.prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property || property.status !== 'active') return;

      const savedRows = await this.prisma.savedSearch.findMany({
        select: { id: true, userId: true, filters: true },
      });

      for (const row of savedRows) {
        const filters = parsePropertySearchFilters(row.filters);
        if (!hasTextQuery(filters) && !hasStructuredFilter(filters)) continue;
        const where: Prisma.PropertyWhereInput = {
          AND: [{ id: propertyId }, this.buildWhere(filters)],
        };
        const hit = await this.prisma.property.findFirst({ where });
        if (!hit) continue;
        if (row.userId === property.postedById) continue;
        try {
          await this.notifications.notifySavedSearchMatch(
            row.userId,
            property.title,
          );
        } catch {
          /* best-effort */
        }
      }
    } catch (err) {
      this.logger.warn(
        `Saved-search instant match notification failed for ${propertyId}`,
        err,
      );
    }
  }

  async autocompleteSuggestions(
    qRaw: string,
    field: 'city' | 'locality',
  ): Promise<string[]> {
    const q = qRaw.trim();
    if (q.length < 2) return [];
    if (!this.propertySearchIndex.isEnabled()) {
      return this.autocompletePrismaFallback(q, field);
    }
    const client = this.propertySearchIndex.getClient();
    if (!client) return [];
    try {
      await this.propertySearchIndex.ensureIndex();
      const index = this.propertySearchIndex.getIndexName();
      const keywordField =
        field === 'city' ? 'city.keyword' : 'localityPublic.keyword';
      const res = await client.search({
        index,
        size: 0,
        query: {
          bool: {
            filter: [{ term: { status: 'active' } }],
            must: [
              {
                wildcard: {
                  [keywordField]: {
                    value: `*${escapeForWildcard(q)}*`,
                    case_insensitive: true,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          uniq: {
            terms: {
              field: keywordField,
              size: 8,
            },
          },
        },
      });
      const buckets = (
        res.aggregations?.uniq as { buckets?: { key: string }[] } | undefined
      )?.buckets;
      const out = (buckets ?? [])
        .map((b) => b.key)
        .filter(Boolean)
        .slice(0, 5);
      return out;
    } catch (err) {
      this.logger.warn('Elasticsearch autocomplete failed', err);
      return this.autocompletePrismaFallback(q, field);
    }
  }

  private async autocompletePrismaFallback(
    q: string,
    field: 'city' | 'locality',
  ): Promise<string[]> {
    const seen = new Set<string>();
    const out: string[] = [];
    if (field === 'city') {
      const rows = await this.prisma.property.findMany({
        where: {
          status: 'active',
          city: { contains: q, mode: 'insensitive' },
        },
        select: { city: true },
        take: 40,
        orderBy: { createdAt: 'desc' },
      });
      for (const r of rows) {
        if (r.city && !seen.has(r.city)) {
          seen.add(r.city);
          out.push(r.city);
          if (out.length >= 5) break;
        }
      }
      return out;
    }
    const rows = await this.prisma.property.findMany({
      where: {
        status: 'active',
        localityPublic: { contains: q, mode: 'insensitive' },
      },
      select: { localityPublic: true },
      take: 40,
      orderBy: { createdAt: 'desc' },
    });
    for (const r of rows) {
      if (r.localityPublic && !seen.has(r.localityPublic)) {
        seen.add(r.localityPublic);
        out.push(r.localityPublic);
        if (out.length >= 5) break;
      }
    }
    return out;
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
      let tokens = tokenizeSearchQuery(trimmed);
      if (tokens.length === 0) {
        tokens = trimmed.length ? [trimmed] : [];
      }
      for (const tok of tokens) {
        and.push({
          OR: [
            { title: { contains: tok, mode: 'insensitive' } },
            { city: { contains: tok, mode: 'insensitive' } },
            { localityPublic: { contains: tok, mode: 'insensitive' } },
            { areaPublic: { contains: tok, mode: 'insensitive' } },
            { description: { contains: tok, mode: 'insensitive' } },
          ],
        });
      }
    }

    return {
      status: 'active',
      ...(and.length ? { AND: and } : {}),
    };
  }

  private buildElasticsearchQuery(
    filters: PropertySearchFilters,
    sort: SearchSortMode,
  ): {
    query: Record<string, unknown>;
    sort: Record<string, unknown>[];
    aggs: Record<string, unknown>;
  } {
    const filter: Record<string, unknown>[] = [{ term: { status: 'active' } }];
    if (filters.city?.trim()) {
      filter.push({ term: { 'city.keyword': filters.city.trim() } });
    }
    if (filters.propertyType) {
      filter.push({ term: { propertyType: filters.propertyType } });
    }
    if (filters.dealType) {
      filter.push({ term: { dealType: filters.dealType } });
    }
    if (filters.minPrice != null || filters.maxPrice != null) {
      const range: { gte?: number; lte?: number } = {};
      if (filters.minPrice != null) range.gte = filters.minPrice;
      if (filters.maxPrice != null) range.lte = filters.maxPrice;
      filter.push({ range: { price: range } });
    }
    if (filters.minAreaSqft != null || filters.maxAreaSqft != null) {
      const range: { gte?: number; lte?: number } = {};
      if (filters.minAreaSqft != null) range.gte = filters.minAreaSqft;
      if (filters.maxAreaSqft != null) range.lte = filters.maxAreaSqft;
      filter.push({ range: { areaSqft: range } });
    }
    if (filters.isBankAuction === true || filters.isBankAuction === false) {
      filter.push({ term: { isBankAuction: filters.isBankAuction } });
    }
    if (filters.distressedLabel) {
      filter.push({ term: { distressedLabel: filters.distressedLabel } });
    }

    const must: Record<string, unknown>[] = [];
    const trimmed = (filters.q ?? '').trim();
    if (trimmed) {
      let tokens = tokenizeSearchQuery(trimmed);
      if (tokens.length === 0) {
        tokens = trimmed.length ? [trimmed] : [];
      }
      for (const tok of tokens) {
        must.push({
          multi_match: {
            query: tok,
            fields: [
              'title^2',
              'description',
              'city',
              'areaPublic',
              'localityPublic',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }
    }

    const innerBool: Record<string, unknown> = {
      filter,
      should: [{ term: { verified: { value: true, boost: 1.25 } } }],
      minimum_should_match: 0,
    };
    if (must.length) {
      innerBool.must = must;
    } else {
      innerBool.must = [{ match_all: {} }];
    }

    const functions: Record<string, unknown>[] = [
      {
        field_value_factor: {
          field: 'matchCount',
          factor: 0.08,
          modifier: 'log1p',
          missing: 0,
        },
      },
      {
        gauss: {
          createdAt: {
            origin: 'now',
            scale: '120d',
            decay: 0.65,
          },
        },
        weight: 0.35,
      },
    ];

    const hasGeo =
      typeof filters.lat === 'number' &&
      Number.isFinite(filters.lat) &&
      typeof filters.lon === 'number' &&
      Number.isFinite(filters.lon);
    if (hasGeo) {
      // Geo: boost nearby, strict filter if radiusKm set
      // Requires location: geo_point in index mapping
      // Run reindex if mapping was changed
      functions.push({
        gauss: {
          location: {
            origin: { lat: filters.lat, lon: filters.lon },
            scale: '20km',
            offset: '5km',
            decay: 0.5,
          },
        },
        weight: 2,
      });
      if (filters.radiusKm != null) {
        filter.push({
          geo_distance: {
            distance: `${filters.radiusKm}km`,
            location: { lat: filters.lat, lon: filters.lon },
          },
        });
      }
    }

    const query: Record<string, unknown> = {
      function_score: {
        query: { bool: innerBool },
        boost_mode: 'multiply',
        score_mode: 'multiply',
        functions,
      },
    };

    const aggs: Record<string, unknown> = {
      by_type: {
        terms: { field: 'propertyType', size: 10 },
      },
      by_deal_type: {
        terms: { field: 'dealType', size: 5 },
      },
      by_city: {
        terms: { field: 'city.keyword', size: 20 },
      },
      price_stats: {
        stats: { field: 'price' },
      },
      price_histogram: {
        histogram: {
          field: 'price',
          interval: 5000000,
          min_doc_count: 1,
        },
      },
    };

    let sortArr: Record<string, unknown>[] = [];
    if (sort === 'price_asc') {
      sortArr = [{ price: 'asc' }, { _score: 'desc' }];
    } else if (sort === 'price_desc') {
      sortArr = [{ price: 'desc' }, { _score: 'desc' }];
    } else if (sort === 'newest') {
      sortArr = [{ createdAt: 'desc' }];
    } else {
      sortArr = [{ _score: 'desc' }, { createdAt: 'desc' }];
    }

    return { query, sort: sortArr, aggs };
  }

  private async executePropertySearch(
    filters: PropertySearchFilters,
    opts: { page: number; limit: number; sort: SearchSortMode },
  ) {
    const esConfigured = Boolean(
      this.config.get<string>('ELASTICSEARCH_URL')?.trim(),
    );
    const started = Date.now();
    this.logger.debug(
      `Search filters=${JSON.stringify(filters)} ES=${esConfigured ? 'configured' : 'unset'}`,
    );

    if (!hasTextQuery(filters) && !hasStructuredFilter(filters)) {
      return {
        hits: [] as SearchHitRow[],
        total: 0,
        tookMs: 0,
        took: 0,
        note: 'Enter a search query or choose at least one filter.',
        fallback: false,
        facets: {
          types: [],
          dealTypes: [],
          cities: [],
          priceRange: { min: 0, max: 0, avg: 0 },
          priceHistogram: [],
        },
      };
    }

    const from = (opts.page - 1) * opts.limit;

    if (this.propertySearchIndex.isEnabled()) {
      const client = this.propertySearchIndex.getClient();
      if (client) {
        try {
          await this.propertySearchIndex.ensureIndex();
          const index = this.propertySearchIndex.getIndexName();
          const { query, sort, aggs } = this.buildElasticsearchQuery(
            filters,
            opts.sort,
          );
          const res = await client.search({
            index,
            query: query as never,
            sort: sort as never,
            aggs: aggs as never,
            from,
            size: opts.limit,
            track_total_hits: true,
            _source: [
              'id',
              'title',
              'city',
              'price',
              'areaSqft',
              'distressedLabel',
              'imageUrls',
            ],
          });
          const tookMs =
            typeof res.took === 'number' ? res.took : Date.now() - started;
          const total =
            typeof res.hits.total === 'number'
              ? res.hits.total
              : (res.hits.total as { value?: number })?.value ?? 0;
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
              distressedLabel:
                typeof src.distressedLabel === 'string'
                  ? src.distressedLabel
                  : undefined,
              imageUrls: Array.isArray(src.imageUrls)
                ? (src.imageUrls as string[])
                : undefined,
              _score: typeof h._score === 'number' ? h._score : undefined,
            };
          });
          const aggregations = (res.aggregations ?? {}) as Record<string, unknown>;
          const byType =
            ((aggregations.by_type as { buckets?: Array<{ key: string; doc_count: number }> } | undefined)
              ?.buckets ?? []);
          const byDealType =
            ((aggregations.by_deal_type as { buckets?: Array<{ key: string; doc_count: number }> } | undefined)
              ?.buckets ?? []);
          const byCity =
            ((aggregations.by_city as { buckets?: Array<{ key: string; doc_count: number }> } | undefined)
              ?.buckets ?? []);
          const priceStats =
            (aggregations.price_stats as {
              min?: number | null;
              max?: number | null;
              avg?: number | null;
            } | undefined) ?? {};
          const priceHistogram =
            ((aggregations.price_histogram as {
              buckets?: Array<{ key: number; doc_count: number }>;
            } | undefined)?.buckets ?? []);
          return {
            hits,
            total,
            tookMs,
            took: tookMs,
            note: `Elasticsearch index ${index}.`,
            fallback: false,
            facets: {
              types: byType.map((b) => ({ key: b.key, count: b.doc_count })),
              dealTypes: byDealType.map((b) => ({
                key: b.key,
                count: b.doc_count,
              })),
              cities: byCity.map((b) => ({ key: b.key, count: b.doc_count })),
              priceRange: {
                min: Number(priceStats.min ?? 0),
                max: Number(priceStats.max ?? 0),
                avg: Number(priceStats.avg ?? 0),
              },
              priceHistogram,
            },
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
    let orderBy: Prisma.PropertyOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (opts.sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (opts.sort === 'price_desc') {
      orderBy = { price: 'desc' };
    }
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({
        where,
        skip: from,
        take: opts.limit,
        orderBy,
      }),
    ]);
    const hits: SearchHitRow[] = rows.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      price: p.price,
      areaSqft: p.areaSqft,
      distressedLabel: p.distressedLabel,
      imageUrls: p.imageUrls?.length ? [p.imageUrls[0]] : undefined,
      _score: undefined,
    }));
    const tookMs = Date.now() - started;
    const note = esConfigured
      ? 'PostgreSQL fallback (Elasticsearch error or unreachable).'
      : 'PostgreSQL text + filters. Set ELASTICSEARCH_URL for ES-backed search.';
    return {
      hits,
      total,
      tookMs,
      took: null as number | null,
      note,
      fallback: true,
      facets: null,
    };
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
