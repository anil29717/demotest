import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ComplianceAlertSeverity,
  ComplianceAlertStatus,
  ComplianceAlertType,
  DdCaseStatus,
  DdItemStatus,
  DealStage,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export type ComplianceFeedItem = {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  body: string;
  dealId: string | null;
  kind: 'alert' | 'advisory';
  alertType?: string;
  status?: 'OPEN' | 'RESOLVED';
  resolvable: boolean;
  resolvedByName?: string | null;
};

type DealStageRule = {
  id: string;
  whenStage: DealStage;
  severity: 'info' | 'warning';
  title: string;
  body: string;
};

const DEFAULT_STAGE_RULES: DealStageRule[] = [
  {
    id: 'rule-legal-stage',
    whenStage: DealStage.LEGAL,
    severity: 'warning',
    title: 'Legal stage checklist',
    body: 'Confirm executed term sheet, counsel details, and title diligence pack before advancing.',
  },
  {
    id: 'rule-payment-stage',
    whenStage: DealStage.PAYMENT,
    severity: 'warning',
    title: 'Payment controls',
    body: 'Verify milestone approvals and escrow instructions match the active deal record.',
  },
];

function normRuleSeverity(s: 'info' | 'warning'): 'LOW' | 'MEDIUM' {
  return s === 'warning' ? 'MEDIUM' : 'LOW';
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);
  private extraRules: DealStageRule[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    const raw = this.config.get<string>('COMPLIANCE_RULES_JSON')?.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { rules?: DealStageRule[] };
        if (Array.isArray(parsed.rules)) {
          this.extraRules = parsed.rules;
        }
      } catch (e) {
        this.logger.warn('Invalid COMPLIANCE_RULES_JSON; ignoring override', e);
      }
    }
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

  /** Ensures MISSING_NDA / MISSING_RERA rows match current deal + user NDA / RERA signals. */
  async syncDealAlerts(dealId: string, userId: string): Promise<void> {
    const deal = await this.findDealIfAccessible(dealId, userId, {
      organization: { select: { id: true, reraNumber: true } },
      institution: {
        select: {
          id: true,
          ndaRequired: true,
          institutionName: true,
        },
      },
      property: { select: { postedById: true } },
    });
    if (!deal) return;

    const orgRera = deal.organization.reraNumber?.trim();
    const agent = deal.property?.postedById
      ? await this.prisma.user.findUnique({
          where: { id: deal.property.postedById },
          select: { reraId: true },
        })
      : null;
    const agentRera = agent?.reraId?.trim();
    const hasRera = Boolean(orgRera || agentRera);
    const needsRera = !hasRera;

    let needsNda = false;
    if (deal.institutionId && deal.institution?.ndaRequired) {
      const nda = await this.prisma.nda.findUnique({
        where: {
          userId_institutionId: {
            userId,
            institutionId: deal.institutionId,
          },
        },
      });
      needsNda = !nda || nda.status !== 'APPROVED';
    }

    await this.applyGapAlert({
      dealId: deal.id,
      organizationId: deal.organizationId,
      type: ComplianceAlertType.MISSING_NDA,
      severity: ComplianceAlertSeverity.HIGH,
      title: 'Missing approved NDA',
      body: deal.institution?.institutionName
        ? `Institutional diligence requires an approved NDA for ${deal.institution.institutionName}.`
        : 'Institutional diligence requires an approved NDA before sharing confidential details.',
      needs: needsNda,
    });

    await this.applyGapAlert({
      dealId: deal.id,
      organizationId: deal.organizationId,
      type: ComplianceAlertType.MISSING_RERA,
      severity: ComplianceAlertSeverity.MEDIUM,
      title: 'Missing RERA on record',
      body:
        'Add your organisation firm RERA (workspace setup) or the listing agent’s RERA (profile) so this deal meets broker registration expectations.',
      needs: needsRera,
    });
  }

  private async applyGapAlert(params: {
    dealId: string;
    organizationId: string;
    type: ComplianceAlertType;
    severity: ComplianceAlertSeverity;
    title: string;
    body: string;
    needs: boolean;
  }): Promise<void> {
    const existing = await this.prisma.complianceAlert.findUnique({
      where: {
        dealId_type: { dealId: params.dealId, type: params.type },
      },
    });

    if (params.needs) {
      if (!existing) {
        await this.prisma.complianceAlert.create({
          data: {
            dealId: params.dealId,
            organizationId: params.organizationId,
            type: params.type,
            severity: params.severity,
            status: ComplianceAlertStatus.OPEN,
            title: params.title,
            body: params.body,
          },
        });
        return;
      }
      if (existing.status === ComplianceAlertStatus.RESOLVED) {
        await this.prisma.complianceAlert.update({
          where: { id: existing.id },
          data: {
            status: ComplianceAlertStatus.OPEN,
            severity: params.severity,
            title: params.title,
            body: params.body,
            resolvedAt: null,
            resolvedByUserId: null,
          },
        });
        return;
      }
      await this.prisma.complianceAlert.update({
        where: { id: existing.id },
        data: {
          severity: params.severity,
          title: params.title,
          body: params.body,
        },
      });
      return;
    }

    if (existing?.status === ComplianceAlertStatus.OPEN) {
      await this.prisma.complianceAlert.update({
        where: { id: existing.id },
        data: {
          status: ComplianceAlertStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedByUserId: null,
        },
      });
    }
  }

  private async syncAlertsForUserDeals(userId: string, maxDeals = 60): Promise<void> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const orClause: Prisma.DealWhereInput[] = [{ requirement: { userId } }];
    if (orgIds.length) orClause.push({ organizationId: { in: orgIds } });
    const deals = await this.prisma.deal.findMany({
      where: { OR: orClause },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take: maxDeals,
    });
    for (const d of deals) {
      try {
        await this.syncDealAlerts(d.id, userId);
      } catch (err) {
        this.logger.warn(`syncDealAlerts skipped for ${d.id}`, err);
      }
    }
  }

  async listDealAlerts(userId: string, dealId: string) {
    await this.syncDealAlerts(dealId, userId);
    const deal = await this.findDealIfAccessible(dealId, userId, {});
    if (!deal) throw new ForbiddenException('Deal not found or no access');

    return this.prisma.complianceAlert.findMany({
      where: { dealId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: {
        resolvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async resolveAlert(userId: string, alertId: string) {
    const alert = await this.prisma.complianceAlert.findUnique({
      where: { id: alertId },
      select: { id: true, dealId: true, status: true },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    const deal = await this.findDealIfAccessible(alert.dealId, userId, {});
    if (!deal) throw new ForbiddenException('Deal not found or no access');
    if (alert.status === ComplianceAlertStatus.RESOLVED) {
      return this.prisma.complianceAlert.findUnique({
        where: { id: alertId },
        include: {
          resolvedBy: { select: { id: true, name: true } },
        },
      });
    }

    const updated = await this.prisma.complianceAlert.update({
      where: { id: alertId },
      data: {
        status: ComplianceAlertStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedByUserId: userId,
      },
      include: {
        resolvedBy: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      userId,
      action: 'COMPLIANCE_ALERT_RESOLVED',
      entityType: 'compliance_alert',
      entityId: alertId,
      metadata: { dealId: alert.dealId },
    });

    return updated;
  }

  async recordDealStageAdvance(params: {
    userId: string;
    dealId: string;
    from: DealStage;
    to: DealStage;
  }): Promise<void> {
    await this.audit.log({
      userId: params.userId,
      action: 'COMPLIANCE_DEAL_STAGE_ADVANCE',
      entityType: 'deal',
      entityId: params.dealId,
      metadata: { from: params.from, to: params.to },
    });
  }

  async buildFeed(
    userId: string,
    role: UserRole,
    dealId?: string,
  ): Promise<{
    userId: string;
    role: UserRole;
    dealId: string | null;
    items: ComplianceFeedItem[];
  }> {
    if (dealId) {
      await this.syncDealAlerts(dealId, userId);
    } else {
      await this.syncAlertsForUserDeals(userId);
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const orClause: Prisma.DealWhereInput[] = [{ requirement: { userId } }];
    if (orgIds.length) orClause.push({ organizationId: { in: orgIds } });
    const accessibleDeals = await this.prisma.deal.findMany({
      where: { OR: orClause },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    const accessibleDealIds = new Set(accessibleDeals.map((d) => d.id));

    let dealIdFilter: Prisma.StringFilter | string;
    if (dealId) {
      dealIdFilter = accessibleDealIds.has(dealId)
        ? dealId
        : { in: [] };
    } else if (accessibleDealIds.size) {
      dealIdFilter = { in: [...accessibleDealIds] };
    } else {
      dealIdFilter = { in: [] };
    }

    const dbAlerts = await this.prisma.complianceAlert.findMany({
      where: {
        status: ComplianceAlertStatus.OPEN,
        dealId: dealIdFilter,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        resolvedBy: { select: { name: true } },
      },
    });

    const items: ComplianceFeedItem[] = dbAlerts.map((a) => ({
      id: a.id,
      severity:
        a.severity === 'HIGH'
          ? 'HIGH'
          : a.severity === 'MEDIUM'
            ? 'MEDIUM'
            : 'LOW',
      title: a.title,
      body: a.body,
      dealId: a.dealId,
      kind: 'alert',
      alertType: a.type,
      status: a.status,
      resolvable: a.status === ComplianceAlertStatus.OPEN,
      resolvedByName: a.resolvedBy?.name ?? null,
    }));

    const ddCases = await this.prisma.dueDiligenceCase.findMany({
      where: {
        dealId: dealId
          ? dealId
          : {
              in: [...accessibleDealIds],
            },
        status: {
          in: [DdCaseStatus.OPEN, DdCaseStatus.IN_PROGRESS, DdCaseStatus.BLOCKED],
        },
      },
      include: {
        items: {
          where: {
            required: true,
            status: { not: DdItemStatus.COMPLETED },
          },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    items.push(
      ...ddCases
        .filter((c) => c.items.length > 0)
        .map((c) => ({
          id: `dd-${c.id}`,
          severity:
            c.status === DdCaseStatus.BLOCKED
              ? ('HIGH' as const)
              : ('MEDIUM' as const),
          title:
            c.status === DdCaseStatus.BLOCKED
              ? 'Due diligence blocker'
              : 'Due diligence pending',
          body: `Deal ${c.dealId?.slice(0, 8)}… has ${c.items.length} required DD item(s) pending.`,
          dealId: c.dealId ?? null,
          kind: 'alert' as const,
          alertType: 'DD_BLOCKER' as const,
          status: 'OPEN' as const,
          resolvable: false,
          resolvedByName: null,
        })),
    );

    const ndaRoles = new Set<UserRole>([
      UserRole.ADMIN,
      UserRole.BROKER,
      UserRole.HNI,
      UserRole.INSTITUTIONAL_BUYER,
      UserRole.INSTITUTIONAL_SELLER,
    ]);
    if (ndaRoles.has(role)) {
      items.push({
        id: 'adv-nda-practice',
        severity: 'MEDIUM',
        title: 'Institutional NDA practice',
        body: 'Unmasked financials require approved NDA and data-room access log.',
        dealId: dealId ?? null,
        kind: 'advisory',
        resolvable: false,
      });
    }

    if (
      role === UserRole.INSTITUTIONAL_BUYER ||
      role === UserRole.INSTITUTIONAL_SELLER ||
      role === UserRole.ADMIN
    ) {
      items.push({
        id: 'adv-data-room',
        severity: 'MEDIUM',
        title: 'Data room access',
        body: 'Log all downloads and restrict unmasked exports to approved parties only.',
        dealId: dealId ?? null,
        kind: 'advisory',
        resolvable: false,
      });
    }

    if (dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: dealId },
        select: { stage: true },
      });
      const stage = deal?.stage;
      if (stage) {
        const allRules = [...DEFAULT_STAGE_RULES, ...this.extraRules];
        for (const r of allRules) {
          if (r.whenStage === stage) {
            items.push({
              id: `dyn-${r.id}`,
              severity: normRuleSeverity(r.severity),
              title: r.title,
              body: r.body,
              dealId,
              kind: 'advisory',
              resolvable: false,
            });
          }
        }
      }
    }

    return { userId, role, dealId: dealId ?? null, items };
  }
}
