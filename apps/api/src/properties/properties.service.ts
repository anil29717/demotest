import { BadRequestException, Injectable } from '@nestjs/common';
import { validateNoContactLeak } from '@ar-buildwel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchingService } from '../matching/matching.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly matching: MatchingService,
  ) {}

  private guardText(title: string, description?: string) {
    const combined = `${title}\n${description ?? ''}`;
    const v = validateNoContactLeak(combined);
    if (!v.ok) throw new BadRequestException(v.reason);
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
        p.distressedLabel === 'high_opportunity' ? 'High-Opportunity Investment Deal' : undefined,
      imageUrls: p.imageUrls?.length ? p.imageUrls : undefined,
      createdAt: p.createdAt,
    };
  }

  async create(userId: string, dto: CreatePropertyDto) {
    this.guardText(dto.title, dto.description);

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
        distressedLabel: dto.isHighOpportunity ? 'high_opportunity' : 'standard',
      },
    });

    await this.audit.log({
      userId,
      action: 'LISTING_CREATED',
      entityType: 'property',
      entityId: row.id,
    });

    await this.matching.runForProperty(row.id);
    return this.toPublic(row);
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
