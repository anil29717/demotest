import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DealStage, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export type ComplianceFeedItem = {
  id: string;
  severity: 'info' | 'warning';
  title: string;
  body: string;
};

type DealStageRule = {
  id: string;
  whenStage: DealStage;
  severity: 'info' | 'warning';
  title: string;
  body: string;
};

/** Config-driven rules merged with static Phase 1 advisory copy. */
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
    const items: ComplianceFeedItem[] = [
      {
        id: '1',
        severity: 'info',
        title: 'Verify RERA registration',
        body: 'Confirm broker RERA before site visit for this corridor.',
      },
    ];

    const ndaRoles = new Set<UserRole>([
      UserRole.ADMIN,
      UserRole.BROKER,
      UserRole.HNI,
      UserRole.INSTITUTIONAL_BUYER,
      UserRole.INSTITUTIONAL_SELLER,
    ]);
    if (ndaRoles.has(role)) {
      items.push({
        id: '2',
        severity: 'warning',
        title: 'Institutional NDA',
        body: 'Unmasked financials require signed NDA and data-room access log.',
      });
    }

    if (
      role === UserRole.INSTITUTIONAL_BUYER ||
      role === UserRole.INSTITUTIONAL_SELLER ||
      role === UserRole.ADMIN
    ) {
      items.push({
        id: '3',
        severity: 'warning',
        title: 'Data room access',
        body: 'Log all downloads and restrict unmasked exports to signed parties only.',
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
              severity: r.severity,
              title: r.title,
              body: r.body,
            });
          }
        }
      }
    }

    const ndaGaps = await this.ndaDealGaps(userId);
    items.push(...ndaGaps);

    return { userId, role, dealId: dealId ?? null, items };
  }

  /** Deals in user orgs with institutional side where NDA is missing or unsigned. */
  private async ndaDealGaps(userId: string): Promise<ComplianceFeedItem[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (!orgIds.length) return [];

    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId: { in: orgIds },
        institutionId: { not: null },
      },
      take: 80,
      select: { id: true, institutionId: true },
    });

    const out: ComplianceFeedItem[] = [];
    for (const d of deals) {
      if (!d.institutionId) continue;
      const inst = await this.prisma.institution.findUnique({
        where: { id: d.institutionId },
        select: { ndaRequired: true, institutionName: true },
      });
      if (!inst?.ndaRequired) continue;
      const nda = await this.prisma.nda.findUnique({
        where: {
          userId_institutionId: {
            userId,
            institutionId: d.institutionId,
          },
        },
      });
      if (!nda || nda.status !== 'signed') {
        out.push({
          id: `nda-deal-${d.id}`,
          severity: 'warning',
          title: `NDA required — ${inst.institutionName}`,
          body: `Deal ${d.id}: complete NDA before unmasked institutional diligence.`,
        });
      }
    }
    return out;
  }
}
