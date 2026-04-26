import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async publicPreview(institutionId: string) {
    const row = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!row) throw new NotFoundException();
    return {
      id: row.id,
      institutionType: row.institutionType,
      city: row.city,
      maskedSummary: row.maskedSummary,
      askingPriceCr: row.askingPriceCr,
      studentEnrollment: row.studentEnrollment,
      locked: true,
    };
  }

  maskedList() {
    return this.prisma.institution.findMany({
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
  }

  async detailForUser(institutionId: string, userId: string) {
    const row = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });
    if (!row) throw new NotFoundException();

    if (!row.ndaRequired) {
      return {
        ...row,
        locked: false,
      };
    }

    const nda = await this.prisma.nda.findUnique({
      where: {
        userId_institutionId: { userId, institutionId },
      },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    /** Phase 1: NDA approved + qualified role/verification unlocks full record. */
    const canSee =
      nda?.status === 'APPROVED' &&
      (user?.role === 'INSTITUTIONAL_BUYER' ||
        user?.role === 'ADMIN' ||
        user?.role === 'BROKER' ||
        !!user?.verified);

    if (!canSee) {
      return {
        id: row.id,
        institutionType: row.institutionType,
        city: row.city,
        maskedSummary: row.maskedSummary,
        askingPriceCr: row.askingPriceCr,
        studentEnrollment: row.studentEnrollment,
        latitude: row.latitude,
        longitude: row.longitude,
        locked: true,
      };
    }

    return {
      ...row,
      locked: false,
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
      select: { id: true, institutionType: true, city: true },
    });
    if (!row) throw new NotFoundException();
    return {
      institutionId: row.id,
      institutionType: row.institutionType,
      city: row.city,
      sections: [
        { id: 'governance', label: 'Governance & accreditation', items: [] as string[] },
        { id: 'financials', label: 'Audited financials (3y)', items: [] as string[] },
        { id: 'legal', label: 'Title / lease / encumbrance', items: [] as string[] },
        { id: 'operations', label: 'Operations & enrollment', items: [] as string[] },
      ],
      note: 'Structured pack scaffold; attach evidence in Phase 2 data room workflows.',
    };
  }
}
