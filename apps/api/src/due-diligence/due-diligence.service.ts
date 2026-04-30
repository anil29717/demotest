import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  DdCaseStatus,
  DdEventType,
  DdItemStatus,
  NotificationType,
  UserRole,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

type DdChecklistItemInput = {
  id: string;
  label: string;
  done: boolean;
  required?: boolean;
  notes?: string;
  dueAt?: string;
};

@Injectable()
export class DueDiligenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private normalizeKey(input: string): string {
    return String(input ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }

  private async assertDealAccess(
    dealId: string,
    userId: string,
    role: UserRole,
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { property: true, institution: true, requirement: true },
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
    if (!member && !isBuyer && !isSeller && role !== UserRole.ADMIN) {
      throw new ForbiddenException('No access to this deal');
    }
    return { deal, member, isBuyer, isSeller };
  }

  private defaultItemsForDeal(deal: {
    institutionId: string | null;
    property?: { isBankAuction?: boolean; distressedLabel?: string } | null;
  }) {
    return [
      { key: 'title', label: 'Title chain review', required: true, sortOrder: 10 },
      {
        key: 'encumbrance',
        label: 'Encumbrance certificate',
        required: true,
        sortOrder: 20,
      },
      {
        key: 'rera',
        label: 'RERA / project registration',
        required: true,
        sortOrder: 30,
      },
      ...(deal.institutionId
        ? [
            {
              key: 'nda',
              label: 'Institutional NDA signed',
              required: true,
              sortOrder: 40,
            },
          ]
        : []),
      ...(deal.property?.isBankAuction
        ? [
            {
              key: 'auction',
              label: 'Auction terms & possession risk',
              required: false,
              sortOrder: 50,
            },
          ]
        : []),
      ...(deal.property?.distressedLabel === 'high_opportunity'
        ? [
            {
              key: 'special',
              label: 'Special-situation disclosures',
              required: false,
              sortOrder: 60,
            },
          ]
        : []),
    ];
  }

  private inferCaseStatus(
    statuses: DdItemStatus[],
    current: DdCaseStatus,
  ): DdCaseStatus {
    if (!statuses.length) return current;
    if (statuses.some((s) => s === DdItemStatus.BLOCKED)) {
      return DdCaseStatus.BLOCKED;
    }
    if (statuses.every((s) => s === DdItemStatus.COMPLETED)) {
      return DdCaseStatus.COMPLETED;
    }
    if (statuses.some((s) => s === DdItemStatus.IN_PROGRESS || s === DdItemStatus.COMPLETED)) {
      return DdCaseStatus.IN_PROGRESS;
    }
    return DdCaseStatus.OPEN;
  }

  private async logEvent(params: {
    caseId: string;
    type: DdEventType;
    actorUserId?: string | null;
    itemId?: string | null;
    detail?: Record<string, unknown> | null;
  }) {
    await this.prisma.dueDiligenceEvent.create({
      data: {
        caseId: params.caseId,
        type: params.type,
        actorUserId: params.actorUserId ?? null,
        itemId: params.itemId ?? null,
        detail: (params.detail ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private async maybeNotifyAssignee(
    userId: string | null | undefined,
    dealId: string,
    label: string,
  ) {
    if (!userId) return;
    await this.notifications.createInApp(
      userId,
      NotificationType.ALERT,
      'Due diligence task assigned',
      `Deal ${dealId.slice(0, 8)}… · ${label}`,
      { dealId, feature: 'due_diligence' },
    );
  }

  async getOrCreateCaseForDeal(actor: {
    userId: string;
    role: UserRole;
    dealId: string;
  }) {
    const { deal } = await this.assertDealAccess(
      actor.dealId,
      actor.userId,
      actor.role,
    );
    let ddCase = await this.prisma.dueDiligenceCase.findUnique({
      where: { dealId: actor.dealId },
    });
    if (!ddCase) {
      ddCase = await this.prisma.dueDiligenceCase.create({
        data: {
          dealId: actor.dealId,
          organizationId: deal.organizationId,
          ownerUserId: actor.userId,
          summary: 'Deal-level due diligence',
          status: DdCaseStatus.OPEN,
        },
      });
      const defaults = this.defaultItemsForDeal(deal);
      if (defaults.length) {
        await this.prisma.dueDiligenceItem.createMany({
          data: defaults.map((x) => ({
            caseId: ddCase!.id,
            key: x.key,
            label: x.label,
            required: x.required,
            sortOrder: x.sortOrder,
            status: DdItemStatus.OPEN,
          })),
        });
      }
      await this.logEvent({
        caseId: ddCase.id,
        type: DdEventType.CASE_CREATED,
        actorUserId: actor.userId,
        detail: { dealId: actor.dealId },
      });
    }
    return ddCase;
  }

  async getDealCaseView(actor: { userId: string; role: UserRole; dealId: string }) {
    const { deal } = await this.assertDealAccess(actor.dealId, actor.userId, actor.role);
    const ddCase = await this.getOrCreateCaseForDeal(actor);
    const [items, members] = await Promise.all([
      this.prisma.dueDiligenceItem.findMany({
        where: { caseId: ddCase.id },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          assignee: { select: { id: true, name: true, role: true } },
          evidence: {
            orderBy: { createdAt: 'desc' },
            include: {
              uploadedBy: { select: { id: true, name: true } },
              document: { select: { id: true, storageKey: true, type: true } },
            },
          },
        },
      }),
      this.prisma.organizationMember.findMany({
        where: { organizationId: deal.organizationId },
        select: { user: { select: { id: true, name: true, role: true } } },
      }),
    ]);
    const statuses = items.map((i) => i.status);
    const inferred = this.inferCaseStatus(statuses, ddCase.status);
    if (inferred !== ddCase.status) {
      await this.prisma.dueDiligenceCase.update({
        where: { id: ddCase.id },
        data: {
          status: inferred,
          completedAt: inferred === DdCaseStatus.COMPLETED ? new Date() : null,
        },
      });
    }
    const requiredDone = items.filter((i) => i.required && i.status === DdItemStatus.COMPLETED).length;
    const requiredTotal = items.filter((i) => i.required).length;
    return {
      case: {
        ...ddCase,
        status: inferred,
        requiredDone,
        requiredTotal,
      },
      items,
      members: members.map((m) => m.user),
    };
  }

  async listItems(actor: { userId: string; role: UserRole; dealId: string }) {
    const data = await this.getDealCaseView(actor);
    return data.items;
  }

  async upsertItems(
    actor: { userId: string; role: UserRole; dealId: string },
    items: DdChecklistItemInput[],
    note?: string,
  ) {
    const data = await this.getDealCaseView(actor);
    const ddCaseId = data.case.id;
    const existingByKey = new Map(data.items.map((i) => [i.key, i]));
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!;
      const key = this.normalizeKey(item.id || item.label || `item_${index + 1}`);
      if (!key) continue;
      const status = item.done ? DdItemStatus.COMPLETED : DdItemStatus.OPEN;
      const now = new Date();
      const dueAt = item.dueAt ? new Date(item.dueAt) : undefined;
      const existing = existingByKey.get(key);
      if (existing) {
        await this.prisma.dueDiligenceItem.update({
          where: { id: existing.id },
          data: {
            label: String(item.label).trim().slice(0, 300),
            status,
            required: item.required ?? existing.required,
            notes: item.notes?.trim() || existing.notes,
            sortOrder: (index + 1) * 10,
            dueAt: dueAt ?? existing.dueAt,
            completedAt: status === DdItemStatus.COMPLETED ? now : null,
          },
        });
      } else {
        await this.prisma.dueDiligenceItem.create({
          data: {
            caseId: ddCaseId,
            key,
            label: String(item.label).trim().slice(0, 300),
            required: item.required ?? true,
            status,
            notes: item.notes?.trim() || null,
            sortOrder: (index + 1) * 10,
            dueAt,
            completedAt: status === DdItemStatus.COMPLETED ? now : null,
          },
        });
      }
    }
    await this.logEvent({
      caseId: ddCaseId,
      type: DdEventType.ITEMS_SYNCED,
      actorUserId: actor.userId,
      detail: {
        count: items.length,
        note: note?.trim() || null,
      },
    });
    if (note?.trim()) {
      await this.logEvent({
        caseId: ddCaseId,
        type: DdEventType.NOTE_ADDED,
        actorUserId: actor.userId,
        detail: { note: note.trim() },
      });
    }
    return this.getDealCaseView(actor);
  }

  async assignItem(
    actor: { userId: string; role: UserRole },
    itemId: string,
    assigneeUserId: string | null,
  ) {
    const item = await this.prisma.dueDiligenceItem.findUnique({
      where: { id: itemId },
      include: {
        ddCase: { include: { deal: { include: { requirement: true, property: true, institution: true } } } },
      },
    });
    if (!item || !item.ddCase.dealId || !item.ddCase.deal) {
      throw new BadRequestException('DD item not found');
    }
    await this.assertDealAccess(item.ddCase.dealId, actor.userId, actor.role);
    const updated = await this.prisma.dueDiligenceItem.update({
      where: { id: item.id },
      data: {
        assigneeUserId: assigneeUserId || null,
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
    });
    await this.logEvent({
      caseId: item.caseId,
      itemId: item.id,
      actorUserId: actor.userId,
      type: DdEventType.ITEM_ASSIGNED,
      detail: { assigneeUserId: assigneeUserId || null, label: item.label },
    });
    await this.maybeNotifyAssignee(
      assigneeUserId,
      item.ddCase.dealId,
      item.label,
    );
    return updated;
  }

  async updateItemStatus(
    actor: { userId: string; role: UserRole },
    itemId: string,
    status: DdItemStatus,
    note?: string,
  ) {
    const item = await this.prisma.dueDiligenceItem.findUnique({
      where: { id: itemId },
      include: { ddCase: true },
    });
    if (!item || !item.ddCase.dealId) {
      throw new BadRequestException('DD item not found');
    }
    await this.assertDealAccess(item.ddCase.dealId, actor.userId, actor.role);
    const now = new Date();
    const updated = await this.prisma.dueDiligenceItem.update({
      where: { id: itemId },
      data: {
        status,
        notes: note?.trim() || item.notes,
        completedAt: status === DdItemStatus.COMPLETED ? now : null,
      },
      include: {
        assignee: { select: { id: true, name: true, role: true } },
      },
    });
    await this.logEvent({
      caseId: item.caseId,
      itemId: item.id,
      actorUserId: actor.userId,
      type: DdEventType.ITEM_STATUS_CHANGED,
      detail: { from: item.status, to: status, note: note?.trim() || null },
    });
    const items = await this.prisma.dueDiligenceItem.findMany({
      where: { caseId: item.caseId },
      select: { status: true },
    });
    const inferred = this.inferCaseStatus(
      items.map((x) => x.status),
      item.ddCase.status,
    );
    if (inferred !== item.ddCase.status) {
      await this.prisma.dueDiligenceCase.update({
        where: { id: item.caseId },
        data: {
          status: inferred,
          completedAt: inferred === DdCaseStatus.COMPLETED ? now : null,
        },
      });
      await this.logEvent({
        caseId: item.caseId,
        actorUserId: actor.userId,
        type: DdEventType.CASE_STATUS_CHANGED,
        detail: { from: item.ddCase.status, to: inferred },
      });
    }
    return updated;
  }

  async attachEvidence(
    actor: { userId: string; role: UserRole },
    itemId: string,
    payload: {
      documentId?: string;
      url?: string;
      kind: string;
      title?: string;
      notes?: string;
    },
  ) {
    const item = await this.prisma.dueDiligenceItem.findUnique({
      where: { id: itemId },
      include: { ddCase: true },
    });
    if (!item || !item.ddCase.dealId) {
      throw new BadRequestException('DD item not found');
    }
    await this.assertDealAccess(item.ddCase.dealId, actor.userId, actor.role);
    const evidence = await this.prisma.dueDiligenceEvidence.create({
      data: {
        itemId,
        documentId: payload.documentId || null,
        uploadedByUserId: actor.userId,
        kind: payload.kind.trim().slice(0, 80) || 'attachment',
        title: payload.title?.trim().slice(0, 240) || null,
        url: payload.url?.trim() || null,
        notes: payload.notes?.trim().slice(0, 1000) || null,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        document: { select: { id: true, storageKey: true, type: true } },
      },
    });
    await this.logEvent({
      caseId: item.caseId,
      itemId: item.id,
      actorUserId: actor.userId,
      type: DdEventType.EVIDENCE_ADDED,
      detail: {
        evidenceId: evidence.id,
        kind: evidence.kind,
        title: evidence.title,
      },
    });
    return evidence;
  }

  async listCaseHistory(actor: { userId: string; role: UserRole; dealId: string }) {
    const ddCase = await this.getOrCreateCaseForDeal(actor);
    await this.assertDealAccess(actor.dealId, actor.userId, actor.role);
    const events = await this.prisma.dueDiligenceEvent.findMany({
      where: { caseId: ddCase.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        actor: { select: { id: true, name: true, role: true } },
        item: { select: { id: true, key: true, label: true } },
      },
    });
    return events;
  }

  async listOpenBlockersForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (!orgIds.length) return [];
    return this.prisma.dueDiligenceCase.findMany({
      where: {
        organizationId: { in: orgIds },
        status: { in: [DdCaseStatus.OPEN, DdCaseStatus.BLOCKED, DdCaseStatus.IN_PROGRESS] },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        deal: { select: { id: true, stage: true } },
        items: {
          where: { required: true, status: { not: DdItemStatus.COMPLETED } },
          select: { id: true },
        },
      },
    });
  }

  async propertyChecklistTemplate(userId: string, role: UserRole, propertyId: string) {
    const p = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
        postedById: true,
        distressedLabel: true,
        isBankAuction: true,
      },
    });
    if (!p) throw new BadRequestException('Property not found');
    const canView =
      role === UserRole.ADMIN ||
      role === UserRole.BROKER ||
      p.postedById === userId ||
      p.status === 'active';
    if (!canView) {
      throw new ForbiddenException('Listing not visible for this account');
    }
    const items = [
      { id: 'title', label: 'Title chain review', done: false },
      { id: 'encumbrance', label: 'Encumbrance certificate', done: false },
      { id: 'rera', label: 'RERA / approvals', done: false },
      ...(p.isBankAuction
        ? [{ id: 'auction', label: 'Auction terms & possession risk', done: false }]
        : []),
      ...(p.distressedLabel === 'high_opportunity'
        ? [{ id: 'special', label: 'Special-situation disclosures', done: false }]
        : []),
    ];
    return { propertyId, city: p.city, title: p.title, items };
  }

  async getOrCreateCaseForInstitution(params: {
    institutionId: string;
    actorUserId: string;
    organizationId?: string | null;
  }) {
    let ddCase = await this.prisma.dueDiligenceCase.findUnique({
      where: { institutionId: params.institutionId },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            assignee: { select: { id: true, name: true, role: true } },
            evidence: {
              orderBy: { createdAt: 'desc' },
              include: {
                uploadedBy: { select: { id: true, name: true } },
                document: { select: { id: true, storageKey: true, type: true } },
              },
            },
          },
        },
      },
    });
    if (!ddCase) {
      ddCase = await this.prisma.dueDiligenceCase.create({
        data: {
          institutionId: params.institutionId,
          organizationId: params.organizationId ?? null,
          ownerUserId: params.actorUserId,
          summary: 'Institution due diligence',
          status: DdCaseStatus.OPEN,
          items: {
            create: [
              { key: 'governance', label: 'Governance & accreditation', required: true, sortOrder: 10 },
              { key: 'financials', label: 'Audited financials (3y)', required: true, sortOrder: 20 },
              { key: 'legal', label: 'Title / lease / encumbrance', required: true, sortOrder: 30 },
              { key: 'operations', label: 'Operations & enrollment', required: true, sortOrder: 40 },
            ],
          },
        },
        include: {
          items: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: {
              assignee: { select: { id: true, name: true, role: true } },
              evidence: {
                orderBy: { createdAt: 'desc' },
                include: {
                  uploadedBy: { select: { id: true, name: true } },
                  document: { select: { id: true, storageKey: true, type: true } },
                },
              },
            },
          },
        },
      });
      await this.logEvent({
        caseId: ddCase.id,
        actorUserId: params.actorUserId,
        type: DdEventType.CASE_CREATED,
        detail: { institutionId: params.institutionId },
      });
    }
    const inferred = this.inferCaseStatus(ddCase.items.map((i) => i.status), ddCase.status);
    if (inferred !== ddCase.status) {
      ddCase = await this.prisma.dueDiligenceCase.update({
        where: { id: ddCase.id },
        data: {
          status: inferred,
          completedAt: inferred === DdCaseStatus.COMPLETED ? new Date() : null,
        },
        include: {
          items: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: {
              assignee: { select: { id: true, name: true, role: true } },
              evidence: {
                orderBy: { createdAt: 'desc' },
                include: {
                  uploadedBy: { select: { id: true, name: true } },
                  document: { select: { id: true, storageKey: true, type: true } },
                },
              },
            },
          },
        },
      });
    }
    return ddCase;
  }
}
