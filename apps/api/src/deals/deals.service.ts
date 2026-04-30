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
import { LeadsService } from '../leads/leads.service';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionOrchestrationService } from '../orchestration/transaction-orchestration.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { computeDealSlaView } from './deal-sla';
import { DealScoreService } from './deal-score.service';
import {
  createInitialStageTasks,
  normalizeStageTasks,
  requiredTasksCompletion,
  type DealStageTaskMap,
} from './stage-tasks';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly orchestration: TransactionOrchestrationService,
    private readonly feeService: FeeService,
    private readonly matching: MatchingService,
    private readonly leads: LeadsService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
    private readonly dealScore: DealScoreService,
  ) {}

  /** When buyer accepts but is not in listing org, attribute pipeline actions to listing owner. */
  private async resolveOrgActorForPipeline(
    userId: string,
    orgId: string,
    listingOwnerId: string,
  ): Promise<string | null> {
    const asUser = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
      select: { id: true },
    });
    if (asUser) return userId;
    const asOwner = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: listingOwnerId },
      select: { id: true },
    });
    if (asOwner) return listingOwnerId;
    return null;
  }

  private async insertDeal(
    userId: string,
    data: {
      organizationId: string;
      requirementId: string;
      propertyId?: string | null;
      institutionId?: string | null;
      stage: DealStage;
    },
    auditExtra?: Record<string, unknown>,
  ) {
    const deal = await this.prisma.deal.create({
      data: {
        organizationId: data.organizationId,
        requirementId: data.requirementId,
        propertyId: data.propertyId ?? null,
        institutionId: data.institutionId ?? null,
        stage: data.stage,
        stageTasks: createInitialStageTasks(),
      },
    });

    await this.audit.log({
      userId,
      action: 'DEAL_CREATED',
      entityType: 'deal',
      entityId: deal.id,
      ...(auditExtra ? { metadata: auditExtra } : {}),
    });

    return deal;
  }

  /**
   * After a match is accepted: CRM lead + deal at MATCH (when listing org exists).
   * Idempotent if lead/deal already exists.
   */
  async ensurePipelineFromAcceptedMatch(userId: string, matchId: string) {
    const row = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        property: true,
        requirement: true,
      },
    });
    if (!row) {
      throw new BadRequestException('Match not found');
    }
    const property = row.property;
    const req = row.requirement;
    if (property.postedById !== userId && req.userId !== userId) {
      throw new BadRequestException('Not authorized for this match');
    }

    const score = row.combinedScore ?? row.matchScore;
    await this.leads.createFromMatchIfBroker(property, req, score);

    if (!property.organizationId) {
      return { leadSynced: true, deal: null as null };
    }

    const orgId = property.organizationId;
    const existingDeal = await this.prisma.deal.findFirst({
      where: {
        organizationId: orgId,
        requirementId: req.id,
        propertyId: property.id,
      },
    });
    if (existingDeal) {
      return { leadSynced: true, deal: existingDeal };
    }

    const actorId = await this.resolveOrgActorForPipeline(
      userId,
      orgId,
      property.postedById,
    );
    if (!actorId) {
      return { leadSynced: true, deal: null };
    }

    const requirement = await this.prisma.requirement.findUnique({
      where: { id: req.id },
      select: { id: true },
    });
    if (!requirement) {
      throw new BadRequestException('Requirement not found');
    }

    const propCheck = await this.prisma.property.findUnique({
      where: { id: property.id },
      select: { id: true, organizationId: true },
    });
    if (!propCheck) throw new BadRequestException('Property not found');
    if (
      propCheck.organizationId &&
      propCheck.organizationId !== orgId
    ) {
      throw new BadRequestException(
        'Property does not belong to this organization',
      );
    }

    const deal = await this.insertDeal(
      actorId,
      {
        organizationId: orgId,
        requirementId: req.id,
        propertyId: property.id,
        institutionId: null,
        stage: DealStage.MATCH,
      },
      { source: 'accepted_match', matchId },
    );

    return { leadSynced: true, deal };
  }

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

    return this.insertDeal(userId, {
      organizationId: dto.organizationId,
      requirementId: dto.requirementId,
      propertyId: dto.propertyId,
      institutionId: dto.institutionId,
      stage: DealStage.LEAD,
    });
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const deals = await this.prisma.deal.findMany({
      where: {
        OR: [
          ...(orgIds.length ? [{ organizationId: { in: orgIds } }] : []),
          { requirement: { userId } },
          { property: { postedById: userId } },
          { institution: { postedById: userId } },
        ],
      },
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
    const withScore = await Promise.all(
      deals.map(async (d) => ({
        ...d,
        closureProbability: await this.dealScore.calculateClosureProbability(d),
      })),
    );
    return withScore;
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
    const deal = await this.findDealIfAccessible(dealId, userId, {
      requirement: { select: { id: true, userId: true, city: true } },
      property: true,
      institution: true,
    });
    if (!deal) return null;
    return {
      ...deal,
      stageTasks: normalizeStageTasks(
        (deal as unknown as { stageTasks?: unknown }).stageTasks,
      ),
      closureProbability: await this.dealScore.calculateClosureProbability(deal),
      sla: computeDealSlaView(deal.stage, deal.stageEnteredAt),
    };
  }

  async list(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
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
    const withScore = await Promise.all(
      deals.map(async (d) => ({
        ...d,
        closureProbability: await this.dealScore.calculateClosureProbability(d),
      })),
    );
    return withScore;
  }

  async listForOrganizationUser(userId: string, organizationId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
      select: { id: true },
    });
    if (!member) throw new BadRequestException('Not a member of organization');
    return this.list(organizationId);
  }

  async advance(userId: string, dealId: string, remark: string) {
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
    const updated = await this.orchestration.advanceDeal(dealId, userId, {
      remark,
    });
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
    const score = await this.dealScore.calculateClosureProbability(updated);
    this.logger.log(
      `Deal ${dealId} closure probability ${score.probability}% (${score.label})`,
    );
    return { ...updated, closureProbability: score };
  }

  async moveBack(userId: string, dealId: string, remark: string) {
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
    const updated = await this.orchestration.moveBackDeal(dealId, userId, {
      remark,
    });
    try {
      const broker = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const label = broker?.name?.trim() || 'Broker';
      await this.chat.createSystemMessageForDeal(
        dealId,
        `Deal moved back to ${updated.stage} by ${label}`,
      );
    } catch {
      // Non-blocking chat compliance trail
    }
    const score = await this.dealScore.calculateClosureProbability(updated);
    this.logger.log(
      `Deal ${dealId} moved back. closure probability ${score.probability}% (${score.label})`,
    );
    return { ...updated, closureProbability: score };
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
    const [logs, docs, services, offers] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { entityType: 'deal', entityId: dealId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      this.prisma.document.findMany({
        where: { dealId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { uploadedBy: { select: { id: true, name: true } } },
      }),
      this.prisma.serviceRequest.findMany({
        where: { dealId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          partner: { select: { id: true, name: true, type: true, city: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.dealOffer
        .findMany({
          where: { dealId },
          orderBy: { createdAt: 'asc' },
          include: {
            offeredBy: { select: { id: true, name: true, role: true } },
          },
        }),
    ]);
    return { dealId, logs, documents: docs, services, offers };
  }

  async addNote(userId: string, dealId: string, note: string) {
    const text = note.trim();
    if (!text) throw new BadRequestException('Note is required');
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        organizationId: true,
        requirement: { select: { userId: true } },
        property: { select: { postedById: true } },
        institution: { select: { postedById: true } },
      },
    });
    if (!deal) throw new BadRequestException('Deal not found');
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
      select: { id: true },
    });
    const isBuyer = deal.requirement.userId === userId;
    const isSeller =
      deal.property?.postedById === userId ||
      deal.institution?.postedById === userId;
    if (!member && !isBuyer && !isSeller) {
      throw new BadRequestException('No access to add note on this deal');
    }
    await this.audit.log({
      userId,
      action: 'DEAL_NOTE_ADDED',
      entityType: 'deal',
      entityId: dealId,
      metadata: { note: text.slice(0, 1000) },
    });
    return { ok: true };
  }

  private async tryAutoAdvanceFromCompletedTasks(
    userId: string,
    dealId: string,
  ): Promise<{
    stage: DealStage;
    stageTasks: DealStageTaskMap;
    autoAdvanced: boolean;
  }> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { requirement: true },
    });
    if (!deal) {
      throw new BadRequestException('Deal not found');
    }
    const map = normalizeStageTasks(
      (deal as unknown as { stageTasks?: unknown }).stageTasks,
    );
    if (deal.stage !== DealStage.LEAD && deal.stage !== DealStage.MATCH) {
      return { stage: deal.stage, stageTasks: map, autoAdvanced: false };
    }
    const prog = requiredTasksCompletion(map, deal.stage);
    if (prog.pendingLabels.length > 0) {
      return { stage: deal.stage, stageTasks: map, autoAdvanced: false };
    }
    const remark =
      deal.stage === DealStage.LEAD
        ? 'Auto: lead tasks complete'
        : 'Auto: match tasks complete';
    const updated = await this.orchestration.advanceDeal(dealId, userId, {
      remark,
    });
    const finalMap = normalizeStageTasks(
      (updated as unknown as { stageTasks?: unknown }).stageTasks,
    );
    return { stage: updated.stage, stageTasks: finalMap, autoAdvanced: true };
  }

  async updateStageTask(
    userId: string,
    dealId: string,
    payload: { stage: DealStage; key: string; done?: boolean; notes?: string },
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        organizationId: true,
        stage: true,
        stageTasks: true,
      },
    });
    if (!deal) throw new BadRequestException('Deal not found');
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
      select: { id: true },
    });
    if (!member) throw new BadRequestException('Not a member of organization');

    const map = normalizeStageTasks(deal.stageTasks);
    const stageTasks = map[payload.stage] ?? [];
    const idx = stageTasks.findIndex((t) => t.key === payload.key);
    if (idx < 0) throw new BadRequestException('Task not found for stage');

    const taskLabel = stageTasks[idx]?.label ?? payload.key;

    stageTasks[idx] = {
      ...stageTasks[idx],
      ...(payload.done !== undefined ? { done: payload.done } : {}),
      ...(payload.notes !== undefined
        ? { notes: payload.notes.trim().slice(0, 500) }
        : {}),
    };
    map[payload.stage] = stageTasks;

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: { stageTasks: map as Prisma.InputJsonValue },
      select: { id: true, stage: true, stageTasks: true },
    });

    await this.audit.log({
      userId,
      action: 'DEAL_STAGE_TASK_UPDATED',
      entityType: 'deal',
      entityId: dealId,
      metadata: {
        stage: payload.stage,
        key: payload.key,
        taskLabel,
        done: payload.done,
      },
    });

    let stage = updated.stage;
    let stageTasksOut = normalizeStageTasks(updated.stageTasks) as DealStageTaskMap;
    let autoAdvanced = false;

    if (
      updated.stage === DealStage.LEAD ||
      updated.stage === DealStage.MATCH
    ) {
      try {
        const adv = await this.tryAutoAdvanceFromCompletedTasks(userId, dealId);
        stage = adv.stage;
        stageTasksOut = adv.stageTasks;
        autoAdvanced = adv.autoAdvanced;
      } catch (e) {
        this.logger.warn(
          `Auto-advance after tasks skipped for deal ${dealId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return {
      id: updated.id,
      stage,
      stageTasks: stageTasksOut,
      autoAdvanced,
    };
  }

  async createOffer(
    userId: string,
    dealId: string,
    payload: { amountInr: number; notes?: string },
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        organizationId: true,
        requirement: { select: { userId: true } },
        property: { select: { postedById: true } },
        institution: { select: { postedById: true } },
      },
    });
    if (!deal) throw new BadRequestException('Deal not found');
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId },
      select: { id: true },
    });
    const isBuyer = deal.requirement.userId === userId;
    const isSeller =
      deal.property?.postedById === userId ||
      deal.institution?.postedById === userId;
    if (!member && !isBuyer && !isSeller) {
      throw new BadRequestException('No access to submit offer on this deal');
    }
    if (!Number.isFinite(payload.amountInr) || payload.amountInr <= 0) {
      throw new BadRequestException('Offer amount must be greater than zero');
    }
    const row = await this.prisma.dealOffer.create({
      data: {
        dealId,
        offeredById: userId,
        amountInr: payload.amountInr,
        notes: payload.notes?.trim() || null,
      },
      include: { offeredBy: { select: { id: true, name: true, role: true } } },
    });
    await this.audit.log({
      userId,
      action: 'DEAL_OFFER_CREATED',
      entityType: 'deal',
      entityId: dealId,
      metadata: { amountInr: payload.amountInr },
    });
    try {
      const label = row.offeredBy.name?.trim() || row.offeredBy.role || 'User';
      await this.chat.createSystemMessageForDeal(
        dealId,
        `${label} submitted an offer of ₹${Number(row.amountInr).toLocaleString('en-IN')}`,
      );
    } catch {
      // non-blocking
    }
    return row;
  }
}
