import { Injectable, BadRequestException } from '@nestjs/common';
import { DealStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DEAL_STAGE_SLA_HOURS } from '../deals/deal-sla';
import {
  normalizeStageTasks,
  requiredTasksCompletion,
} from '../deals/stage-tasks';

const ORDER: DealStage[] = [
  DealStage.LEAD,
  DealStage.REQUIREMENT,
  DealStage.MATCH,
  DealStage.SITE_VISIT,
  DealStage.NEGOTIATION,
  DealStage.LEGAL,
  DealStage.LOAN,
  DealStage.INSURANCE,
  DealStage.PAYMENT,
  DealStage.CLOSURE,
];

@Injectable()
export class TransactionOrchestrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly compliance: ComplianceService,
    private readonly notifications: NotificationsService,
  ) {}

  private nextStage(current: DealStage): DealStage | null {
    const i = ORDER.indexOf(current);
    if (i < 0 || i >= ORDER.length - 1) return null;
    return ORDER[i + 1];
  }

  private prevStage(current: DealStage): DealStage | null {
    const i = ORDER.indexOf(current);
    if (i <= 0) return null;
    return ORDER[i - 1];
  }

  private async resolveAssetLabel(
    propertyId: string | null,
    institutionId: string | null,
  ): Promise<string> {
    if (propertyId) {
      const p = await this.prisma.property.findUnique({
        where: { id: propertyId },
        select: { title: true },
      });
      return p?.title ?? 'Property listing';
    }
    if (institutionId) {
      const i = await this.prisma.institution.findUnique({
        where: { id: institutionId },
        select: { maskedSummary: true, institutionName: true },
      });
      return i?.maskedSummary ?? i?.institutionName ?? 'Institutional listing';
    }
    return 'Deal';
  }

  private async notifyDealParticipants(
    dealId: string,
    organizationId: string,
    requirementUserId: string,
    assetLabel: string,
    fromStage: DealStage,
    toStage: DealStage,
  ) {
    const targets = new Set<string>();
    targets.add(requirementUserId);
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
      take: 50,
    });
    for (const m of members) {
      targets.add(m.userId);
    }
    const fromLabel = String(fromStage);
    const toLabel = String(toStage);
    for (const uid of targets) {
      try {
        await this.notifications.notifyDealStageChange({
          userId: uid,
          dealId,
          assetLabel,
          fromStage: fromLabel,
          toStage: toLabel,
        });
      } catch {
        /* non-blocking */
      }
    }
  }

  async advanceDeal(
    dealId: string,
    userId: string,
    opts?: { remark?: string },
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { requirement: true },
    });
    if (!deal) throw new BadRequestException('Deal not found');

    if (deal.institutionId) {
      const nda = await this.prisma.nda.findUnique({
        where: {
          userId_institutionId: {
            userId: deal.requirement.userId,
            institutionId: deal.institutionId,
          },
        },
      });
      if (nda?.status !== 'APPROVED') {
        throw new BadRequestException(
          'Institutional deal: buyer must sign NDA before advancing this pipeline.',
        );
      }
    }

    const next = this.nextStage(deal.stage);
    if (!next) throw new BadRequestException('Already at closure');

    const progress = requiredTasksCompletion(
      normalizeStageTasks((deal as unknown as { stageTasks?: unknown }).stageTasks),
      deal.stage,
    );
    if (progress.pendingLabels.length > 0) {
      throw new BadRequestException(
        `Complete required stage tasks before advancing. Pending: ${progress.pendingLabels.join(', ')}`,
      );
    }

    const sla = DEAL_STAGE_SLA_HOURS[deal.stage];
    const elapsed =
      (Date.now() - deal.stageEnteredAt.getTime()) / (1000 * 60 * 60);
    let slaBreachCount = deal.slaBreachCount;
    if (sla && elapsed > sla) {
      slaBreachCount += 1;
      await this.notifySlaBreach(deal, elapsed);
    }

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: next,
        stageEnteredAt: new Date(),
        slaBreachCount,
        dealHealthScore: Math.max(
          0,
          (deal.dealHealthScore ?? 50) -
            (slaBreachCount > deal.slaBreachCount ? 5 : 0),
        ),
      },
    });

    const previousTransitions = await this.prisma.activityLog.count({
      where: {
        entityType: 'deal',
        entityId: dealId,
        action: 'DEAL_STAGE_ADVANCED',
      },
    });
    const version = previousTransitions + 1;
    const remark = opts?.remark?.trim() || 'No remark';

    await this.audit.log({
      userId,
      action: 'DEAL_STAGE_ADVANCED',
      entityType: 'deal',
      entityId: dealId,
      metadata: { from: deal.stage, to: next, remark, version },
    });

    await this.compliance.recordDealStageAdvance({
      userId,
      dealId,
      from: deal.stage,
      to: next,
    });

    const assetLabel = await this.resolveAssetLabel(
      deal.propertyId,
      deal.institutionId,
    );
    await this.notifyDealParticipants(
      dealId,
      deal.organizationId,
      deal.requirement.userId,
      assetLabel,
      deal.stage,
      next,
    );

    return updated;
  }

  async moveBackDeal(
    dealId: string,
    userId: string,
    opts?: { remark?: string },
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { requirement: true },
    });
    if (!deal) throw new BadRequestException('Deal not found');

    const prev = this.prevStage(deal.stage);
    if (!prev) throw new BadRequestException('Already at first stage');

    const updated = await this.prisma.deal.update({
      where: { id: dealId },
      data: {
        stage: prev,
        stageEnteredAt: new Date(),
      },
    });

    const previousTransitions = await this.prisma.activityLog.count({
      where: {
        entityType: 'deal',
        entityId: dealId,
        action: { in: ['DEAL_STAGE_ADVANCED', 'DEAL_STAGE_MOVED_BACK'] },
      },
    });
    const version = previousTransitions + 1;
    const remark = opts?.remark?.trim() || 'No remark';

    await this.audit.log({
      userId,
      action: 'DEAL_STAGE_MOVED_BACK',
      entityType: 'deal',
      entityId: dealId,
      metadata: { from: deal.stage, to: prev, remark, version },
    });

    await this.compliance.recordDealStageAdvance({
      userId,
      dealId,
      from: deal.stage,
      to: prev,
    });

    const assetLabel = await this.resolveAssetLabel(
      deal.propertyId,
      deal.institutionId,
    );
    await this.notifyDealParticipants(
      dealId,
      deal.organizationId,
      deal.requirement.userId,
      assetLabel,
      deal.stage,
      prev,
    );

    return updated;
  }

  private async notifySlaBreach(
    deal: { id: string; organizationId: string },
    elapsedHours: number,
  ) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: deal.organizationId },
      take: 20,
    });
    for (const m of members) {
      try {
        await this.notifications.notifySlaWarning({
          userId: m.userId,
          dealId: deal.id,
          elapsedHours,
        });
      } catch {
        /* non-blocking */
      }
    }
  }

  checkDependency(
    institutionalStage: number | null,
    ndaSigned: boolean,
  ): boolean {
    if (institutionalStage == null) return true;
    if (institutionalStage >= 4 && !ndaSigned) return false;
    return true;
  }
}
