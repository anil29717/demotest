import { BadRequestException, Injectable } from '@nestjs/common';
import { DealStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionOrchestrationService } from '../orchestration/transaction-orchestration.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orchestration: TransactionOrchestrationService,
  ) {}

  async create(userId: string, dto: CreateDealDto) {
    if (!dto.propertyId && !dto.institutionId) {
      throw new BadRequestException('propertyId or institutionId required');
    }
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: dto.organizationId, userId },
    });
    if (!member) throw new BadRequestException('Not a member of organization');

    const deal = await this.prisma.deal.create({
      data: {
        organizationId: dto.organizationId,
        requirementId: dto.requirementId,
        propertyId: dto.propertyId,
        institutionId: dto.institutionId,
        stage: dto.stage ?? DealStage.LEAD,
      },
    });

    await this.audit.log({
      userId,
      action: 'DEAL_CREATED',
      entityType: 'deal',
      entityId: deal.id,
    });

    return deal;
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (!orgIds.length) return [];
    return this.prisma.deal.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { updatedAt: 'desc' },
      include: {
        requirement: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            areaPublic: true,
            localityPublic: true,
            price: true,
          },
        },
        institution: {
          select: {
            id: true,
            maskedSummary: true,
            city: true,
            askingPriceCr: true,
          },
        },
      },
    });
  }

  async getOne(dealId: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        requirement: true,
        property: true,
        institution: true,
      },
    });
    if (!deal) return null;
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
    });
    if (!member) return null;
    return deal;
  }

  async list(organizationId: string) {
    return this.prisma.deal.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        requirement: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            areaPublic: true,
            localityPublic: true,
            price: true,
          },
        },
        institution: {
          select: {
            id: true,
            maskedSummary: true,
            city: true,
            askingPriceCr: true,
          },
        },
      },
    });
  }

  async advance(userId: string, dealId: string) {
    return this.orchestration.advanceDeal(dealId, userId);
  }

  async patch(userId: string, dealId: string, dto: UpdateDealDto) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new BadRequestException('Deal not found');
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
    });
    if (!member) throw new BadRequestException('Not a member of organization');

    const email =
      dto.coBrokerInviteEmail === undefined
        ? undefined
        : dto.coBrokerInviteEmail === ''
          ? null
          : dto.coBrokerInviteEmail;

    return this.prisma.deal.update({
      where: { id: dealId },
      data: {
        ...(email !== undefined && { coBrokerInviteEmail: email }),
        ...(dto.commissionSplitPct !== undefined && {
          commissionSplitPct: dto.commissionSplitPct,
        }),
      },
    });
  }

  async timeline(dealId: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new BadRequestException('Deal not found');
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
    });
    if (!member) throw new BadRequestException('Not a member of organization');
    const [logs, docs, services] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { entityType: 'deal', entityId: dealId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.document.findMany({
        where: { dealId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.serviceRequest.findMany({
        where: { dealId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { dealId, logs, documents: docs, services };
  }
}
