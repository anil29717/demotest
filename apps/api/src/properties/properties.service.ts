import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchingService } from '../matching/matching.service';
import { FraudService } from '../fraud/fraud.service';
import { PropertySearchIndexService } from '../search/property-search-index.service';
import { SearchService } from '../search/search.service';
import { ContactPolicyService } from '../contact-policy/contact-policy.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { randomUUID } from 'crypto';

const PROPERTY_STATUSES = new Set(['active', 'inactive', 'sold', 'withdrawn']);

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly matching: MatchingService,
    private readonly fraud: FraudService,
    private readonly propertySearchIndex: PropertySearchIndexService,
    private readonly searchService: SearchService,
    private readonly contactPolicy: ContactPolicyService,
  ) {}

  private guardText(
    title: string,
    description: string | undefined,
    areaPublic: string,
    localityPublic: string,
  ) {
    this.contactPolicy.assertPropertyListingPublicText({
      title,
      description,
      areaPublic,
      localityPublic,
    });
  }

  toPublic(p: {
    id: string;
    title: string;
    description: string | null;
    propertyType: string;
    dealType: string;
    price: unknown;
    areaSqft: number;
    city: string;
    areaPublic: string;
    localityPublic: string;
    latitude: number;
    longitude: number;
    trustScore: number;
    status: string;
    distressedLabel: string;
    imageUrls: string[];
    createdAt: Date;
  }) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      propertyType: p.propertyType,
      dealType: p.dealType,
      price: p.price,
      areaSqft: p.areaSqft,
      city: p.city,
      areaPublic: p.areaPublic,
      localityPublic: p.localityPublic,
      latitude: p.latitude,
      longitude: p.longitude,
      trustScore: p.trustScore,
      status: p.status,
      presentationLabel:
        p.distressedLabel === 'high_opportunity'
          ? 'High-Opportunity Investment Deal'
          : undefined,
      imageUrls: p.imageUrls?.length ? p.imageUrls : undefined,
      createdAt: p.createdAt,
    };
  }

  async create(userId: string, dto: CreatePropertyDto) {
    this.guardText(
      dto.title,
      dto.description,
      dto.areaPublic,
      dto.localityPublic,
    );

    if (dto.organizationId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { organizationId: dto.organizationId, userId },
        select: { id: true },
      });
      if (!member)
        throw new BadRequestException('Not a member of organization');
    }

    const row = await this.prisma.property.create({
      data: {
        postedById: userId,
        organizationId: dto.organizationId,
        title: dto.title,
        description: dto.description,
        propertyType: dto.propertyType,
        dealType: dto.dealType,
        price: dto.price,
        areaSqft: dto.areaSqft,
        city: dto.city,
        areaPublic: dto.areaPublic,
        localityPublic: dto.localityPublic,
        addressPrivate: dto.addressPrivate,
        latitude: dto.latitude,
        longitude: dto.longitude,
        imageUrls: dto.imageUrls ?? [],
        distressedLabel: dto.isHighOpportunity
          ? 'high_opportunity'
          : 'standard',
      },
    });

    await this.audit.log({
      userId,
      action: 'LISTING_CREATED',
      entityType: 'property',
      entityId: row.id,
    });

    try {
      await this.matching.runForProperty(row.id);
    } catch {
      // Keep listing creation resilient if downstream matching side-effects fail.
    }

    try {
      await this.propertySearchIndex.upsertFromProperty(row);
    } catch (err) {
      this.logger.warn(`Elasticsearch index upsert skipped for ${row.id}`, err);
    }

    void this.searchService.notifyInstantSavedSearchMatches(row.id);

    const listingRisk = await this.fraud.duplicateListingRisk(row.id);
    return { ...this.toPublic(row), listingRisk };
  }

  async updateStatus(actor: JwtPayloadUser, id: string, status: string) {
    if (!PROPERTY_STATUSES.has(status)) {
      throw new BadRequestException(
        `Invalid status (allowed: ${[...PROPERTY_STATUSES].join(', ')})`,
      );
    }
    const row = await this.prisma.property.findUnique({ where: { id } });
    if (!row) throw new BadRequestException('Property not found');
    if (actor.role !== UserRole.ADMIN && row.postedById !== actor.sub) {
      throw new ForbiddenException('Not authorized to update this listing');
    }
    const updated = await this.prisma.property.update({
      where: { id },
      data: { status },
    });
    await this.audit.log({
      userId: actor.sub,
      action: 'LISTING_STATUS_UPDATED',
      entityType: 'property',
      entityId: id,
    });
    try {
      await this.propertySearchIndex.upsertFromProperty(updated);
    } catch (err) {
      this.logger.warn(`Elasticsearch index upsert skipped for ${id}`, err);
    }
    return this.toPublic(updated);
  }

  async updateListing(actor: JwtPayloadUser, id: string, dto: UpdatePropertyDto) {
    const row = await this.prisma.property.findUnique({ where: { id } });
    if (!row) throw new BadRequestException('Property not found');
    if (actor.role !== UserRole.ADMIN && row.postedById !== actor.sub) {
      throw new ForbiddenException('Not authorized to update this listing');
    }
    const title = dto.title ?? row.title;
    const description = dto.description ?? row.description ?? undefined;
    const areaPublic = dto.areaPublic ?? row.areaPublic;
    const localityPublic = dto.localityPublic ?? row.localityPublic;
    this.guardText(title, description, areaPublic, localityPublic);

    const distressedLabel =
      dto.isHighOpportunity === true
        ? 'high_opportunity'
        : dto.isHighOpportunity === false
          ? 'standard'
          : row.distressedLabel;

    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.propertyType !== undefined && { propertyType: dto.propertyType }),
        ...(dto.dealType !== undefined && { dealType: dto.dealType }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.areaSqft !== undefined && { areaSqft: dto.areaSqft }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.areaPublic !== undefined && { areaPublic: dto.areaPublic }),
        ...(dto.localityPublic !== undefined && {
          localityPublic: dto.localityPublic,
        }),
        ...(dto.addressPrivate !== undefined && {
          addressPrivate: dto.addressPrivate,
        }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.imageUrls !== undefined && { imageUrls: dto.imageUrls }),
        ...(dto.isBankAuction !== undefined && { isBankAuction: dto.isBankAuction }),
        distressedLabel,
      },
    });
    await this.audit.log({
      userId: actor.sub,
      action: 'LISTING_UPDATED',
      entityType: 'property',
      entityId: id,
    });
    try {
      await this.propertySearchIndex.upsertFromProperty(updated);
    } catch (err) {
      this.logger.warn(`Elasticsearch index upsert skipped for ${id}`, err);
    }
    return this.toPublic(updated);
  }

  async listPublic() {
    const rows = await this.prisma.property.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => this.toPublic(r));
  }

  async getPublic(id: string) {
    const row = await this.prisma.property.findUnique({ where: { id } });
    if (!row) return null;
    return this.toPublic(row);
  }

  async listMine(userId: string) {
    const rows = await this.prisma.property.findMany({
      where: { postedById: userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toPublic(r));
  }

  createUploadUrl(userId: string, fileName: string, contentType?: string) {
    const safe = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `properties/${userId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
    const cdnBase = process.env.MEDIA_CDN_BASE_URL ?? 'https://cdn.example.com';
    return {
      key,
      uploadUrl: `https://upload.example.com/presigned/${encodeURIComponent(key)}`,
      publicUrl: `${cdnBase.replace(/\/+$/, '')}/${key}`,
      method: 'PUT',
      headers: {
        'content-type': contentType ?? 'application/octet-stream',
      },
      note: 'Stub presigned URL. Replace with S3/Cloudinary signer in production.',
    };
  }
}
