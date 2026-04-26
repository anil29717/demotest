import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { DealStage, type Prisma } from '@prisma/client';
import { FeeService } from '../billing/fee.service';
import { ChatService } from '../chat/chat.service';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionOrchestrationService } from '../orchestration/transaction-orchestration.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orchestration: TransactionOrchestrationService,
    private readonly feeService: FeeService,
    private readonly matching: MatchingService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
  ) {}

  async create(userId: string, dto: CreateDealDto) {
    const hasProperty = !!dto.propertyId;
    const hasInstitution = !!dto.institutionId;
    if (hasProperty === hasInstitution) {
      throw new BadRequestException(
        'Exactly one of propertyId or institutionId is required',
      );
    }
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: dto.organizationId, userId },
    });
    if (!member) throw new BadRequestException('Not a member of organization');

    const requirement = await this.prisma.requirement.findUnique({
      where: { id: dto.requirementId },
      select: { id: true },
    });
    if (!requirement) throw new BadRequestException('Requirement not found');

    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
        select: { id: true, organizationId: true },
      });
      if (!property) throw new BadRequestException('Property not found');
      if (
        property.organizationId &&
        property.organizationId !== dto.organizationId
      ) {
        throw new BadRequestException(
          'Property does not belong to this organization',
        );
      }
    }

    if (dto.institutionId) {
      const institution = await this.prisma.institution.findUnique({
        where: { id: dto.institutionId },
        select: { id: true },
      });
      if (!institution) throw new BadRequestException('Institution not found');
    }

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

  private async findDealIfAccessible(
    dealId: string,
    userId: string,
    include: Prisma.DealInclude,
  ) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const orClause: Prisma.DealWhereInput[] = [{ requirement: { userId } }];
    if (orgIds.length) orClause.push({ organizationId: { in: orgIds } });
    return this.prisma.deal.findFirst({
      where: { id: dealId, OR: orClause },
      include,
    });
  }

  async getOne(dealId: string, userId: string) {
    return this.findDealIfAccessible(dealId, userId, {
      requirement: { select: { id: true, userId: true, city: true } },
      property: true,
      institution: true,
    });
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

  async listForOrganizationUser(userId: string, organizationId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!member) throw new BadRequestException('Not a member of organization');
    return this.list(organizationId);
  }

  async advance(userId: string, dealId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: { id: true, organizationId: true },
    });
    if (!deal) throw new BadRequestException('Deal not found');
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
      select: { id: true },
    });
    if (!member) throw new BadRequestException('Not a member of organization');
    const updated = await this.orchestration.advanceDeal(dealId, userId);
    try {
      const broker = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const label = broker?.name?.trim() || 'Broker';
      await this.chat.createSystemMessageForDeal(
        dealId,
        `Deal moved to ${updated.stage} by ${label}`,
      );
    } catch {
      // Non-blocking chat compliance trail
    }
    if (updated.stage === DealStage.CLOSURE) {
      try {
        await this.feeService.createClosurePlatformFeeInvoice(dealId, userId);
      } catch (e) {
        this.logger.warn(
          `Closure platform fee invoice failed for deal ${dealId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      try {
        await this.matching.onDealReachedClosure({
          propertyId: updated.propertyId,
          requirementId: updated.requirementId,
        });
      } catch (e) {
        this.logger.warn(
          `Match closure feedback failed for deal ${dealId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return updated;
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
    const deal = await this.findDealIfAccessible(dealId, userId, {});
    if (!deal) throw new BadRequestException('Deal not found or no access');
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
