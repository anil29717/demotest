import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import type { Property } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Escape `*`, `?`, `\` for Elasticsearch wildcard queries. */
export function escapeForWildcard(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/[*?]/g, '\\$&');
}

export type PropertySearchDocument = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  areaPublic: string;
  localityPublic: string;
  price: number;
  areaSqft: number;
  propertyType: string;
  dealType: string;
  status: string;
  isBankAuction: boolean;
  distressedLabel: string;
  organizationId: string | null;
  userId: string;
  location?: { lat: number; lon: number };
  createdAt: string;
  imageUrls: string[];
  matchCount: number;
  verified: boolean;
};

@Injectable()
export class PropertySearchIndexService implements OnModuleInit {
  private readonly logger = new Logger(PropertySearchIndexService.name);
  private client: Client | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      await this.ensureIndex();
      const empty = await this.isIndexEmpty();
      if (empty) {
        const n = await this.prisma.property.count({
          where: { status: 'active' },
        });
        if (n > 0) {
          this.logger.log(
            'Elasticsearch index is empty; reindexing ACTIVE properties on startup.',
          );
          await this.reindexActive();
        }
      }
    } catch (err) {
      this.logger.warn('Elasticsearch startup bootstrap failed', err);
    }
  }

  isEnabled(): boolean {
    return Boolean(this.config.get<string>('ELASTICSEARCH_URL')?.trim());
  }

  getIndexName(): string {
    return (
      this.config.get<string>('ELASTICSEARCH_INDEX')?.trim() ||
      'arbuildwel_properties'
    );
  }

  getClient(): Client | null {
    if (!this.isEnabled()) {
      return null;
    }
    if (this.client) {
      return this.client;
    }
    const node = this.config.get<string>('ELASTICSEARCH_URL')!.trim();
    const apiKey = this.config.get<string>('ELASTICSEARCH_API_KEY')?.trim();
    this.client = new Client({
      node,
      ...(apiKey ? { auth: { apiKey } } : {}),
    });
    return this.client;
  }

  async ping(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    try {
      await client.ping();
      return true;
    } catch {
      return false;
    }
  }

  private indexSettingsAndMappings(): Record<string, unknown> {
    return {
      settings: {
        analysis: {
          filter: {
            property_synonyms: {
              type: 'synonym',
              synonyms: [
                'flat, apartment',
                'plot, land',
                'bhk, bedroom',
                'cr, crore',
                'l, lakh',
              ],
            },
            property_stop: {
              type: 'stop',
              stopwords: ['in', 'at', 'near', 'for', 'the', 'a', 'an'],
            },
            title_edge_ngram: {
              type: 'edge_ngram',
              min_gram: 2,
              max_gram: 20,
            },
          },
          analyzer: {
            property_text: {
              type: 'custom',
              tokenizer: 'standard',
              filter: [
                'lowercase',
                'property_synonyms',
                'property_stop',
              ],
            },
            title_autocomplete: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'title_edge_ngram', 'property_synonyms'],
            },
            title_autocomplete_search: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'property_synonyms', 'property_stop'],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'property_text',
            fields: {
              autocomplete: {
                type: 'text',
                analyzer: 'title_autocomplete',
                search_analyzer: 'title_autocomplete_search',
              },
            },
          },
          description: { type: 'text', analyzer: 'property_text' },
          city: {
            type: 'text',
            analyzer: 'property_text',
            fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          },
          areaPublic: {
            type: 'text',
            analyzer: 'property_text',
            fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          },
          localityPublic: {
            type: 'text',
            analyzer: 'property_text',
            fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          },
          price: { type: 'scaled_float', scaling_factor: 100 },
          areaSqft: { type: 'integer' },
          propertyType: { type: 'keyword' },
          dealType: { type: 'keyword' },
          status: { type: 'keyword' },
          isBankAuction: { type: 'boolean' },
          distressedLabel: { type: 'keyword' },
          organizationId: { type: 'keyword' },
          userId: { type: 'keyword' },
          location: { type: 'geo_point' },
          createdAt: { type: 'date' },
          imageUrls: { type: 'keyword' },
          matchCount: { type: 'integer' },
          verified: { type: 'boolean' },
        },
      },
    };
  }

  async ensureIndex(): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }
    const index = this.getIndexName();
    const existsRes = await client.indices.exists({ index });
    const exists =
      typeof existsRes === 'boolean'
        ? existsRes
        : Boolean((existsRes as { body?: boolean }).body);
    if (exists) {
      return;
    }
    try {
      const body = this.indexSettingsAndMappings();
      await client.indices.create({
        index,
        settings: body.settings as Record<string, unknown>,
        mappings: body.mappings as Record<string, unknown>,
      });
      this.logger.log(`Created Elasticsearch index "${index}"`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' &&
              err !== null &&
              'message' in err &&
              typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : '';
      if (msg.includes('resource_already_exists_exception')) {
        return;
      }
      throw err;
    }
  }

  private async isIndexEmpty(): Promise<boolean> {
    const client = this.getClient();
    if (!client) return true;
    try {
      const res = await client.count({
        index: this.getIndexName(),
        query: { match_all: {} },
      });
      const n = typeof res.count === 'number' ? res.count : 0;
      return n === 0;
    } catch {
      return true;
    }
  }

  async buildDocumentForProperty(
    row: Property,
  ): Promise<PropertySearchDocument> {
    const [postedBy, matchCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: row.postedById },
        select: { verified: true },
      }),
      this.prisma.match.count({ where: { propertyId: row.id } }),
    ]);
    const lat = row.latitude;
    const lon = row.longitude;
    const hasGeo =
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      !(lat === 0 && lon === 0);
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      city: row.city,
      areaPublic: row.areaPublic,
      localityPublic: row.localityPublic,
      price: Number(row.price),
      areaSqft: Math.round(row.areaSqft),
      propertyType: row.propertyType,
      dealType: row.dealType,
      status: row.status,
      isBankAuction: row.isBankAuction,
      distressedLabel: row.distressedLabel,
      organizationId: row.organizationId,
      userId: row.postedById,
      ...(hasGeo ? { location: { lat, lon } } : {}),
      createdAt: row.createdAt.toISOString(),
      imageUrls: row.imageUrls?.length ? [row.imageUrls[0]] : [],
      matchCount,
      verified: postedBy?.verified ?? false,
    };
  }

  async upsertFromProperty(row: Property): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }
    try {
      await this.ensureIndex();
      const document = await this.buildDocumentForProperty(row);
      if (row.status === 'sold' || row.status === 'withdrawn') {
        try {
          await client.delete({
            index: this.getIndexName(),
            id: row.id,
            refresh: false,
          });
        } catch {
          // ignore missing doc
        }
        return;
      }
      await client.index({
        index: this.getIndexName(),
        id: row.id,
        document,
        refresh: false,
      });
    } catch (err) {
      this.logger.warn(`Failed to index property ${row.id}`, err);
    }
  }

  async refreshMatchCount(propertyId: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    try {
      const n = await this.prisma.match.count({ where: { propertyId } });
      await client.update({
        index: this.getIndexName(),
        id: propertyId,
        doc: { matchCount: n },
        retry_on_conflict: 2,
      });
    } catch (err) {
      this.logger.warn(`Failed to refresh matchCount for ${propertyId}`, err);
    }
  }

  async reindexAll(): Promise<{ indexed: number }> {
    const client = this.getClient();
    if (!client) {
      return { indexed: 0 };
    }
    await this.ensureIndex();
    const index = this.getIndexName();
    let skip = 0;
    const take = 200;
    let indexed = 0;
    for (;;) {
      const rows = await this.prisma.property.findMany({
        orderBy: { id: 'asc' },
        skip,
        take,
      });
      if (rows.length === 0) {
        break;
      }
      const operations: unknown[] = [];
      for (const row of rows) {
        if (row.status === 'sold' || row.status === 'withdrawn') {
          operations.push({ delete: { _index: index, _id: row.id } });
          continue;
        }
        const document = await this.buildDocumentForProperty(row);
        operations.push({ index: { _index: index, _id: row.id } });
        operations.push(document);
      }
      if (operations.length) {
        await client.bulk({ refresh: true, operations: operations as never });
        indexed += rows.length;
      }
      skip += take;
    }
    this.logger.log(`Reindexed ${indexed} properties into "${index}"`);
    return { indexed };
  }

  /** Startup: index ACTIVE listings only when index is empty. */
  async reindexActive(): Promise<{ indexed: number }> {
    const client = this.getClient();
    if (!client) {
      return { indexed: 0 };
    }
    await this.ensureIndex();
    const index = this.getIndexName();
    const rows = await this.prisma.property.findMany({
      where: { status: 'active' },
      orderBy: { id: 'asc' },
    });
    const operations: unknown[] = [];
    for (const row of rows) {
      const document = await this.buildDocumentForProperty(row);
      operations.push({ index: { _index: index, _id: row.id } });
      operations.push(document);
    }
    if (operations.length) {
      await client.bulk({ refresh: true, operations: operations as never });
    }
    this.logger.log(`Reindexed ${rows.length} ACTIVE properties into "${index}"`);
    return { indexed: rows.length };
  }
}
