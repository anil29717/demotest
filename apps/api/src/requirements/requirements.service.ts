import { Injectable } from '@nestjs/common';
import { Urgency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MatchingService } from '../matching/matching.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly matching: MatchingService,
  ) {}

  private tagForUrgency(u: Urgency) {
    if (u === Urgency.IMMEDIATE) return 'HOT';
    if (u === Urgency.WITHIN_30_DAYS) return 'WARM';
    return 'COLD';
  }

  async create(userId: string, dto: CreateRequirementDto) {
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

    await this.matching.runForRequirement(row.id);
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
