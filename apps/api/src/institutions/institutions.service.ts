import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { DueDiligenceService } from '../due-diligence/due-diligence.service';

@Injectable()
export class InstitutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dd: DueDiligenceService,
  ) {}

  private numPrice(v: { toNumber?: () => number } | number | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
    return Number(v);
  }

  /**
   * Masked list plus per-viewer access flags (NDA / poster / admin).
   * Use this from GET /institutions/me so list tabs and CTAs stay accurate.
   */
  async listWithAccessContext(user: JwtPayloadUser) {
    const rows = await this.prisma.institution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        postedById: true,
        institutionType: true,
        city: true,
        maskedSummary: true,
        askingPriceCr: true,
        studentEnrollment: true,
        latitude: true,
        longitude: true,
        verificationStatus: true,
        dealScore: true,
        ndaRequired: true,
        createdAt: true,
      },
    });

    const ndas = await this.prisma.nda.findMany({
      where: { userId: user.sub },
      select: { institutionId: true, status: true, reviewNote: true },
    });
    const ndaMap = new Map(ndas.map((n) => [n.institutionId, n]));

    return rows.map((row) => {
      const nda = ndaMap.get(row.id);
      const isPoster = row.postedById === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;
      const ndaOk = nda?.status === 'APPROVED';
      const noNdaNeeded = !row.ndaRequired;
      const hasFullAccess = isAdmin || isPoster || noNdaNeeded || ndaOk;
      const locked = !hasFullAccess;

      let ndaStatus: 'NOT_REQUESTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
      if (ndaOk) ndaStatus = 'APPROVED';
      else if (nda?.status === 'PENDING') ndaStatus = 'PENDING';
      else if (nda?.status === 'REJECTED') ndaStatus = 'REJECTED';
      else ndaStatus = 'NOT_REQUESTED';

      return {
        id: row.id,
        institutionType: row.institutionType,
        city: row.city,
        maskedSummary: row.maskedSummary ?? `Confidential — ${row.institutionType}`,
        askingPriceCr: this.numPrice(row.askingPriceCr),
        studentEnrollment: row.studentEnrollment,
        latitude: row.latitude,
        longitude: row.longitude,
        verificationStatus: row.verificationStatus,
        dealScore: row.dealScore,
        createdAt: row.createdAt,
        locked,
        ndaStatus,
        reviewNote: nda?.status === 'REJECTED' ? (nda.reviewNote ?? null) : null,
        isPoster,
      };
    });
  }

  async publicPreview(institutionId: string) {
    const row = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!row) throw new NotFoundException();
    return {
      id: row.id,
      institutionType: row.institutionType,
      city: row.city,
      maskedSummary: row.maskedSummary ?? `Confidential — ${row.institutionType}`,
      askingPriceCr: this.numPrice(row.askingPriceCr),
      studentEnrollment: row.studentEnrollment,
      locked: true,
    };
  }

  async maskedList() {
    const rows = await this.prisma.institution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        institutionType: true,
        city: true,
        maskedSummary: true,
        askingPriceCr: true,
        studentEnrollment: true,
        latitude: true,
        longitude: true,
        verificationStatus: true,
        dealScore: true,
        createdAt: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      maskedSummary: row.maskedSummary ?? `Confidential — ${row.institutionType}`,
      askingPriceCr: this.numPrice(row.askingPriceCr),
    }));
  }

  async detailForUser(institutionId: string, user: JwtPayloadUser) {
    const row = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!row) throw new NotFoundException();

    const price = this.numPrice(row.askingPriceCr);

    if (!row.ndaRequired) {
      return {
        ...row,
        askingPriceCr: price,
        maskedSummary: row.maskedSummary ?? `Confidential — ${row.institutionType}`,
        locked: false,
        ndaStatus: 'NOT_REQUIRED' as const,
      };
    }

    const nda = await this.prisma.nda.findUnique({
      where: {
        userId_institutionId: { userId: user.sub, institutionId },
      },
    });
    const canSee =
      user.role === UserRole.ADMIN ||
      row.postedById === user.sub ||
      nda?.status === 'APPROVED';

    if (!canSee) {
      return {
        id: row.id,
        institutionType: row.institutionType,
        city: row.city,
        maskedSummary: row.maskedSummary ?? `Confidential — ${row.institutionType}`,
        askingPriceCr: price,
        studentEnrollment: row.studentEnrollment,
        latitude: row.latitude,
        longitude: row.longitude,
        locked: true,
        ndaRequired: row.ndaRequired,
        ndaStatus:
          nda?.status === 'PENDING' || nda?.status === 'REJECTED'
            ? nda.status
            : ('NOT_REQUESTED' as const),
        reviewNote: nda?.status === 'REJECTED' ? (nda.reviewNote ?? null) : null,
      };
    }

    const accessViaNda = nda?.status === 'APPROVED';
    const ndaStatusUnlocked = accessViaNda
      ? ('APPROVED' as const)
      : row.postedById === user.sub
        ? ('OWNER' as const)
        : user.role === UserRole.ADMIN
          ? ('ADMIN' as const)
          : ('APPROVED' as const);

    return {
      ...row,
      askingPriceCr: price,
      maskedSummary: row.maskedSummary ?? `Confidential — ${row.institutionType}`,
      locked: false,
      ndaStatus: ndaStatusUnlocked,
    };
  }

  /** Module 22 — institutional DD pack outline (template; evidence uploads Phase 2). */
  async ddPackOutline(institutionId: string, userId: string) {
    const approvedNda = await this.prisma.nda.findFirst({
      where: {
        institutionId,
        userId,
        status: 'APPROVED',
      },
    });
    if (!approvedNda) {
      throw new ForbiddenException(
        'NDA approval required to access due diligence pack',
      );
    }

    const row = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, institutionType: true, city: true, postedBy: { select: { activeOrganizationId: true } } },
    });
    if (!row) throw new NotFoundException();
    const ddCase = await this.dd.getOrCreateCaseForInstitution({
      institutionId: row.id,
      actorUserId: userId,
      organizationId: row.postedBy?.activeOrganizationId ?? null,
    });
    const requiredTotal = ddCase.items.filter((x) => x.required).length;
    const requiredDone = ddCase.items.filter(
      (x) => x.required && x.status === 'COMPLETED',
    ).length;
    return {
      institutionId: row.id,
      institutionType: row.institutionType,
      city: row.city,
      ddCase: {
        id: ddCase.id,
        status: ddCase.status,
        requiredDone,
        requiredTotal,
      },
      sections: [
        {
          id: 'governance',
          label: 'Governance & accreditation',
          items: ddCase.items
            .filter((x) => x.key === 'governance')
            .map((x) => ({
              id: x.id,
              label: x.label,
              status: x.status,
              required: x.required,
              evidenceCount: x.evidence.length,
            })),
        },
        {
          id: 'financials',
          label: 'Audited financials (3y)',
          items: ddCase.items
            .filter((x) => x.key === 'financials')
            .map((x) => ({
              id: x.id,
              label: x.label,
              status: x.status,
              required: x.required,
              evidenceCount: x.evidence.length,
            })),
        },
        {
          id: 'legal',
          label: 'Title / lease / encumbrance',
          items: ddCase.items
            .filter((x) => x.key === 'legal')
            .map((x) => ({
              id: x.id,
              label: x.label,
              status: x.status,
              required: x.required,
              evidenceCount: x.evidence.length,
            })),
        },
        {
          id: 'operations',
          label: 'Operations & enrollment',
          items: ddCase.items
            .filter((x) => x.key === 'operations')
            .map((x) => ({
              id: x.id,
              label: x.label,
              status: x.status,
              required: x.required,
              evidenceCount: x.evidence.length,
            })),
        },
      ],
      note: 'Use /dd item APIs to assign owners, update status, and attach evidence.',
    };
  }
}
