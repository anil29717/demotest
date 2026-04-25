import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
import type { Property } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Escape `*`, `?`, `\` for Elasticsearch wildcard queries. */
export function escapeForWildcard(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/[*?]/g, '\\$&');
}

export function propertyToElasticsearchDocument(p: Property) {
  return {
    id: p.id,
    status: p.status,
    title: p.title,
    city: p.city,
    cityLower: p.city.toLowerCase(),
    localityPublic: p.localityPublic,
    propertyType: p.propertyType,
    dealType: p.dealType,
    price: Number(p.price),
    areaSqft: p.areaSqft,
    isBankAuction: p.isBankAuction,
    distressedLabel: p.distressedLabel,
    createdAt: p.createdAt.toISOString(),
  };
}

@Injectable()
export class PropertySearchIndexService {
  private readonly logger = new Logger(PropertySearchIndexService.name);
  private client: Client | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isEnabled(): boolean {
    return Boolean(this.config.get<string>('ELASTICSEARCH_URL')?.trim());
  }

  getIndexName(): string {
    return (
      this.config.get<string>('ELASTICSEARCH_INDEX')?.trim() || 'properties'
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
      await client.indices.create({
        index,
        settings: {
          analysis: {
            normalizer: {
              property_city_lc: {
                type: 'custom',
                filter: ['lowercase'],
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            status: { type: 'keyword' },
            title: { type: 'text' },
            city: { type: 'text' },
            cityLower: {
              type: 'keyword',
              normalizer: 'property_city_lc',
            },
            localityPublic: { type: 'text' },
            propertyType: { type: 'keyword' },
            dealType: { type: 'keyword' },
            price: { type: 'double' },
            areaSqft: { type: 'double' },
            isBankAuction: { type: 'boolean' },
            distressedLabel: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
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

  async upsertFromProperty(row: Property): Promise<void> {
    const client = this.getClient();
    if (!client) {
      return;
    }
    try {
      await this.ensureIndex();
      await client.index({
        index: this.getIndexName(),
        id: row.id,
        document: propertyToElasticsearchDocument(row),
        refresh: false,
      });
    } catch (err) {
      this.logger.warn(`Failed to index property ${row.id}`, err);
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
        operations.push({ index: { _index: index, _id: row.id } });
        operations.push(propertyToElasticsearchDocument(row));
      }
      await client.bulk({ refresh: true, operations: operations as never });
      indexed += rows.length;
      skip += take;
    }
    this.logger.log(`Reindexed ${indexed} properties into "${index}"`);
    return { indexed };
  }
}
