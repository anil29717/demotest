import { BadRequestException, Injectable } from '@nestjs/common';
import { Urgency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchingService } from '../matching/matching.service';
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
