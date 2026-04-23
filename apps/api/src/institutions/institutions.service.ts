import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async publicPreview(institutionId: string) {
    const row = await this.prisma.institution.findUnique({ where: { id: institutionId } });
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
    const nda = await this.prisma.nda.findUnique({
      where: {
        userId_institutionId: { userId, institutionId },
      },
    });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    /** Phase 1: NDA signed unlocks full record for demo; tighten with verified buyer + admin gate in production */
    const canSee =
      nda?.status === 'signed' &&
      (user?.role === 'INSTITUTIONAL_BUYER' ||
        user?.role === 'ADMIN' ||
        user?.role === 'BROKER' ||
        !!user?.verified);

    const row = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!row) throw new NotFoundException();

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
}
