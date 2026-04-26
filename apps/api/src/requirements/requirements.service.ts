import { BadRequestException, Injectable } from '@nestjs/common';
import { DealType, PropertyType, Urgency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchingService } from '../matching/matching.service';
import type { NlpIntentResult } from '../whatsapp/nlp.types';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { ContactPolicyService } from '../contact-policy/contact-policy.service';

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly matching: MatchingService,
    private readonly contactPolicy: ContactPolicyService,
  ) {}

  private tagForUrgency(u: Urgency) {
    if (u === Urgency.IMMEDIATE) return 'HOT';
    if (u === Urgency.WITHIN_30_DAYS) return 'WARM';
    return 'COLD';
  }

  async create(userId: string, dto: CreateRequirementDto) {
    if (dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException(
        'budgetMin must be less than or equal to budgetMax',
      );
    }
    if (dto.areaSqftMin > dto.areaSqftMax) {
      throw new BadRequestException(
        'areaSqftMin must be less than or equal to areaSqftMax',
      );
    }

    this.contactPolicy.assertRequirementPublicSurfaces(dto.city, dto.areas);

    const tag = this.tagForUrgency(dto.urgency);
    const row = await this.prisma.requirement.create({
      data: {
        userId,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        city: dto.city,
        areas: dto.areas,
        propertyType: dto.propertyType,
        dealType: dto.dealType,
        areaSqftMin: dto.areaSqftMin,
        areaSqftMax: dto.areaSqftMax,
        urgency: dto.urgency,
        tag,
      },
    });

    await this.audit.log({
      userId,
      action: 'REQUIREMENT_CREATED',
      entityType: 'requirement',
      entityId: row.id,
    });

    try {
      await this.matching.runForRequirement(row.id);
    } catch {
      // Keep requirement creation resilient if downstream matching side-effects fail.
    }
    return row;
  }

  /** WhatsApp NLP auto-routing — resilient defaults, tagged as whatsapp_auto. */
  async createFromWhatsAppNlp(
    userId: string,
    nlp: NlpIntentResult,
    dealType: DealType,
  ) {
    let city = nlp.city?.trim() || 'Mumbai';
    let areas = nlp.locality?.trim() ? [nlp.locality.trim()] : ['General'];
    try {
      this.contactPolicy.assertRequirementPublicSurfaces(city, areas);
    } catch {
      city = 'Mumbai';
      areas = ['General'];
    }

    let budgetMin = nlp.budgetMin ?? 0;
    let budgetMax = nlp.budgetMax ?? Math.max(budgetMin, 1_000_000);
    if (budgetMin > budgetMax) {
      const t = budgetMin;
      budgetMin = budgetMax;
      budgetMax = t;
    }

    const pt = (nlp.propertyType ?? 'RESIDENTIAL').toUpperCase();
    const propertyType: PropertyType =
      pt === 'COMMERCIAL'
        ? PropertyType.COMMERCIAL
        : pt === 'PLOT'
          ? PropertyType.PLOT
          : pt === 'INSTITUTIONAL'
            ? PropertyType.INSTITUTIONAL
            : PropertyType.RESIDENTIAL;

    const uRaw = (nlp.urgency ?? 'WARM').toUpperCase();
    const tl = (nlp.timeline ?? '').toUpperCase();
    let urgency: Urgency = Urgency.WITHIN_30_DAYS;
    if (uRaw === 'HOT' || tl === 'IMMEDIATE' || uRaw === 'IMMEDIATE') {
      urgency = Urgency.IMMEDIATE;
    } else if (uRaw === 'FLEXIBLE' || tl === 'LONG_TERM') {
      urgency = Urgency.FLEXIBLE;
    }

    let areaSqftMin = 200;
    let areaSqftMax = 20000;
    if (nlp.areaSqft != null && Number.isFinite(nlp.areaSqft)) {
      areaSqftMin = Math.max(1, Math.floor(nlp.areaSqft * 0.9));
      areaSqftMax = Math.max(areaSqftMin + 1, Math.ceil(nlp.areaSqft * 1.1));
    }

    const tag = this.tagForUrgency(urgency);
    const row = await this.prisma.requirement.create({
      data: {
        userId,
        budgetMin,
        budgetMax,
        city,
        areas,
        propertyType,
        dealType,
        areaSqftMin,
        areaSqftMax,
        urgency,
        tag,
        source: 'whatsapp_auto',
      },
    });

    await this.audit.log({
      userId,
      action: 'REQUIREMENT_CREATED',
      entityType: 'requirement',
      entityId: row.id,
      metadata: { source: 'whatsapp_auto' },
    });

    try {
      await this.matching.runForRequirement(row.id);
    } catch {
      // non-blocking
    }
    return row;
  }

  async listMine(userId: string) {
    return this.prisma.requirement.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPublic() {
    return this.prisma.requirement.findMany({
      where: { active: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        city: true,
        areas: true,
        propertyType: true,
        dealType: true,
        budgetMin: true,
        budgetMax: true,
        tag: true,
        urgency: true,
        createdAt: true,
      },
    });
  }
}
