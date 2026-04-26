import { Injectable, BadRequestException } from '@nestjs/common';
import { DealStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';

/** SLA in hours per stage (Module 40). */
const SLA_HOURS: Partial<Record<DealStage, number>> = {
  LEAD: 24,
  REQUIREMENT: 48,
  MATCH: 72,
  SITE_VISIT: 120,
  NEGOTIATION: 168,
  LEGAL: 336,
  LOAN: 240,
  INSURANCE: 72,
  PAYMENT: 72,
  CLOSURE: 72,
};

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
  ) {}

  private nextStage(current: DealStage): DealStage | null {
    const i = ORDER.indexOf(current);
    if (i < 0 || i >= ORDER.length - 1) return null;
    return ORDER[i + 1];
  }

  async advanceDeal(dealId: string, userId: string) {
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

    const sla = SLA_HOURS[deal.stage];
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

    await this.audit.log({
      userId,
      action: 'DEAL_STAGE_ADVANCED',
      entityType: 'deal',
      entityId: dealId,
      metadata: { from: deal.stage, to: next },
    });

    await this.compliance.recordDealStageAdvance({
      userId,
      dealId,
      from: deal.stage,
      to: next,
    });

    return updated;
  }

  private async notifySlaBreach(
    deal: { id: string; organizationId: string },
    elapsedHours: number,
  ) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: deal.organizationId },
      take: 5,
    });
    for (const m of members) {
      await this.prisma.notification.create({
        data: {
          userId: m.userId,
          channel: 'in_app',
          title: 'SLA warning',
          body: `Deal ${deal.id} exceeded SLA (${elapsedHours.toFixed(1)}h in stage)`,
        },
      });
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
