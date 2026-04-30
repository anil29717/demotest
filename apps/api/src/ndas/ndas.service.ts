import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { ChatService } from '../chat/chat.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class NdasService {
  private readonly log = new Logger(NdasService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ChatService))
    private readonly chat: ChatService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async request(
    user: JwtPayloadUser,
    payload: {
      institutionId: string;
      purpose?: string;
      budgetMin?: number;
      budgetMax?: number;
      organizationName?: string;
    },
    ip: string,
  ) {
    if (
      user.role !== UserRole.INSTITUTIONAL_BUYER &&
      user.role !== UserRole.BROKER
    ) {
      throw new ForbiddenException(
        'Only institutional buyers and brokers can request NDA access',
      );
    }
    const userId = user.sub;
    const institutionId = payload.institutionId;
    if (
      payload.budgetMin !== undefined &&
      payload.budgetMax !== undefined &&
      payload.budgetMin > payload.budgetMax
    ) {
      throw new BadRequestException(
        'budgetMin must be less than or equal to budgetMax',
      );
    }
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, postedById: true },
    });
    if (!institution) {
      throw new BadRequestException('Institution not found');
    }
    if (institution.postedById === userId) {
      throw new ForbiddenException(
        'Institution owner cannot request access to own listing',
      );
    }

    const existing = await this.prisma.nda.findUnique({
      where: {
        userId_institutionId: {
          userId,
          institutionId,
        },
      },
      select: { id: true, status: true },
    });
    if (existing?.status === 'APPROVED') {
      throw new BadRequestException('You already have approved access to this institution');
    }
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('You already have a pending request');
    }

    const nda = await this.prisma.nda.upsert({
      where: {
        userId_institutionId: {
          userId,
          institutionId,
        },
      },
      create: {
        userId,
        institutionId,
        status: 'PENDING',
        requestedAt: new Date(),
        purpose: payload.purpose?.trim() || null,
        budgetMin: payload.budgetMin ?? null,
        budgetMax: payload.budgetMax ?? null,
        organizationName: payload.organizationName?.trim() || null,
        ipAddress: ip,
      },
      update: {
        status: 'PENDING',
        requestedAt: new Date(),
        purpose: payload.purpose?.trim() || null,
        budgetMin: payload.budgetMin ?? null,
        budgetMax: payload.budgetMax ?? null,
        organizationName: payload.organizationName?.trim() || null,
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
        ipAddress: ip,
      },
    });

    this.log.log(
      `NDA_REQUEST userId=${userId} institutionId=${institutionId} ndaId=${nda.id} status=${nda.status}`,
    );
    void this.audit
      .log({
        userId,
        action: 'NDA_REQUEST_CREATED',
        entityType: 'nda',
        entityId: nda.id,
        metadata: { institutionId, status: nda.status },
        ip,
      })
      .catch(() => undefined);

    try {
      const buyer = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      const buyerLabel = buyer?.name?.trim() || 'Buyer';
      const deals = await this.prisma.deal.findMany({
        where: {
          institutionId,
          requirement: { userId },
        },
        select: { id: true },
      });
      for (const d of deals) {
        await this.chat.createSystemMessageForDeal(
          d.id,
          `NDA access requested by ${buyerLabel}`,
        );
      }
    } catch {
      // Non-blocking compliance side-channel
    }

    return nda;
  }

  async approve(
    adminUserId: string,
    payload: { institutionId: string; userId: string; reviewNote?: string },
  ) {
    const row = await this.prisma.nda.findUnique({
      where: {
        userId_institutionId: {
          userId: payload.userId,
          institutionId: payload.institutionId,
        },
      },
    });
    if (!row) throw new BadRequestException('NDA request not found');
    const nda = await this.prisma.nda.update({
      where: { id: row.id },
      data: {
        status: 'APPROVED',
        signedAt: new Date(),
        reviewedById: adminUserId,
        reviewedAt: new Date(),
        reviewNote: payload.reviewNote?.trim() || null,
      },
    });
    this.log.log(
      `NDA_APPROVED adminUserId=${adminUserId} targetUserId=${payload.userId} institutionId=${payload.institutionId} ndaId=${nda.id}`,
    );
    void this.audit
      .log({
        userId: adminUserId,
        action: 'NDA_APPROVED',
        entityType: 'nda',
        entityId: nda.id,
        metadata: {
          targetUserId: payload.userId,
          institutionId: payload.institutionId,
        },
      })
      .catch(() => undefined);

    try {
      const inst = await this.prisma.institution.findUnique({
        where: { id: payload.institutionId },
        select: { maskedSummary: true },
      });
      const summary = inst?.maskedSummary ?? 'Institution listing';
      await this.notifications.notifyNdaDecision({
        userId: payload.userId,
        status: 'APPROVED',
        institutionSummary: summary,
        institutionId: payload.institutionId,
        reviewNote: nda.reviewNote,
      });
    } catch {
      /* non-blocking */
    }
    return nda;
  }

  async reject(
    adminUserId: string,
    payload: { institutionId: string; userId: string; reviewNote?: string },
  ) {
    const row = await this.prisma.nda.findUnique({
      where: {
        userId_institutionId: {
          userId: payload.userId,
          institutionId: payload.institutionId,
        },
      },
    });
    if (!row) throw new BadRequestException('NDA request not found');
    const nda = await this.prisma.nda.update({
      where: { id: row.id },
      data: {
        status: 'REJECTED',
        signedAt: null,
        reviewedById: adminUserId,
        reviewedAt: new Date(),
        reviewNote: payload.reviewNote?.trim() || null,
      },
    });
    this.log.log(
      `NDA_REJECTED adminUserId=${adminUserId} targetUserId=${payload.userId} institutionId=${payload.institutionId} ndaId=${nda.id}`,
    );
    void this.audit
      .log({
        userId: adminUserId,
        action: 'NDA_REJECTED',
        entityType: 'nda',
        entityId: nda.id,
        metadata: {
          targetUserId: payload.userId,
          institutionId: payload.institutionId,
        },
      })
      .catch(() => undefined);

    try {
      const inst = await this.prisma.institution.findUnique({
        where: { id: payload.institutionId },
        select: { maskedSummary: true },
      });
      const summary = inst?.maskedSummary ?? 'Institution listing';
      await this.notifications.notifyNdaDecision({
        userId: payload.userId,
        status: 'REJECTED',
        institutionSummary: summary,
        institutionId: payload.institutionId,
        reviewNote: nda.reviewNote,
      });
    } catch {
      /* non-blocking */
    }
    return nda;
  }

  async listRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
    return this.prisma.nda.findMany({
      where: status ? { status } : undefined,
      orderBy: { requestedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        institution: {
          select: {
            id: true,
            institutionType: true,
            city: true,
            institutionName: true,
          },
        },
        reviewedBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  async listIncomingForSeller(
    postedById: string,
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    return this.prisma.nda.findMany({
      where: {
        ...(status ? { status } : {}),
        institution: { postedById },
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        institution: {
          select: {
            id: true,
            institutionType: true,
            city: true,
            institutionName: true,
          },
        },
        reviewedBy: { select: { id: true, name: true, role: true } },
      },
      take: 100,
    });
  }
}
