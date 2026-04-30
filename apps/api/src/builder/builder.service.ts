import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

type ProjectFilters = {
  city?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
};

@Injectable()
export class BuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(builderId: string, data: {
    title: string;
    description?: string;
    city: string;
    locality?: string;
    reraProjectId: string;
    totalUnits?: number;
    pricePerSqft?: number;
    priceMin: number;
    priceMax?: number;
  }) {
    return this.prisma.builderProject.create({
      data: {
        builderId,
        title: data.title,
        description: data.description,
        city: data.city,
        locality: data.locality,
        reraProjectId: data.reraProjectId,
        totalUnits: data.totalUnits ?? 0,
        pricePerSqft: data.pricePerSqft,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
      },
    });
  }

  async listProjects(filters: ProjectFilters) {
    return this.prisma.builderProject.findMany({
      where: {
        ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.minPrice != null || filters.maxPrice != null
          ? {
              AND: [
                ...(filters.minPrice != null ? [{ priceMin: { gte: filters.minPrice } }] : []),
                ...(filters.maxPrice != null ? [{ priceMax: { lte: filters.maxPrice } }] : []),
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { units: true },
    });
  }

  async getProject(id: string) {
    return this.prisma.builderProject.findUnique({
      where: { id },
      include: { units: true },
    });
  }

  async updateProject(actorId: string, role: UserRole, id: string, patch: Record<string, unknown>) {
    const existing = await this.prisma.builderProject.findUnique({
      where: { id },
      select: { builderId: true },
    });
    if (!existing) throw new BadRequestException('Project not found');
    if (role !== UserRole.ADMIN && existing.builderId !== actorId) {
      throw new ForbiddenException('Not allowed to update this project');
    }
    return this.prisma.builderProject.update({
      where: { id },
      data: patch,
    });
  }

  async addUnit(actorId: string, role: UserRole, projectId: string, input: {
    unitType: string;
    unitNumber: string;
    floor?: number;
    areaSqft?: number;
    price?: number;
  }) {
    const project = await this.prisma.builderProject.findUnique({
      where: { id: projectId },
      select: { builderId: true },
    });
    if (!project) throw new BadRequestException('Project not found');
    if (role !== UserRole.ADMIN && project.builderId !== actorId) {
      throw new ForbiddenException('Not allowed to add units for this project');
    }
    return this.prisma.projectUnit.create({
      data: {
        projectId,
        unitType: input.unitType,
        unitNumber: input.unitNumber,
        floor: input.floor,
        areaSqft: input.areaSqft,
        price: input.price,
      },
    });
  }

  async listUnits(projectId: string) {
    return this.prisma.projectUnit.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { unitNumber: 'asc' }],
    });
  }

  async bookUnit(projectId: string, unitId: string, buyerId: string, amount?: number) {
    return this.prisma.$transaction(async (tx) => {
      const unit = await tx.projectUnit.findFirst({
        where: { id: unitId, projectId },
      });
      if (!unit) throw new BadRequestException('Unit not found');
      if (unit.status !== 'AVAILABLE') {
        throw new BadRequestException('Unit is not available for booking');
      }
      await tx.projectUnit.update({
        where: { id: unitId },
        data: { status: 'BOOKED' },
      });
      return tx.projectBooking.create({
        data: {
          projectId,
          unitId,
          buyerId,
          amount,
          status: 'PENDING',
        },
      });
    });
  }

  async listBookings(userId: string, role: UserRole) {
    if (role === UserRole.BUYER) {
      return this.prisma.projectBooking.findMany({
        where: { buyerId: userId },
        orderBy: { bookedAt: 'desc' },
        include: { project: true, unit: true },
      });
    }
    if (role === UserRole.BUILDER) {
      return this.prisma.projectBooking.findMany({
        where: { project: { builderId: userId } },
        orderBy: { bookedAt: 'desc' },
        include: { project: true, unit: true, buyer: { select: { id: true, name: true } } },
      });
    }
    throw new ForbiddenException('Role not allowed');
  }

  async updateBookingStatus(
    bookingId: string,
    actorId: string,
    actorRole: UserRole,
    status: 'CONFIRMED' | 'CANCELLED',
    notes?: string,
  ) {
    const booking = await this.prisma.projectBooking.findUnique({
      where: { id: bookingId },
      include: {
        project: { select: { builderId: true } },
      },
    });
    if (!booking) throw new BadRequestException('Booking not found');
    if (
      actorRole !== UserRole.ADMIN &&
      booking.project.builderId !== actorId
    ) {
      throw new ForbiddenException('Not allowed to update this booking');
    }
    if (status === 'CONFIRMED') {
      return this.prisma.projectBooking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          notes: notes?.trim() || booking.notes,
          unit: { update: { status: 'BOOKED' } },
        },
        include: { project: true, unit: true, buyer: { select: { id: true, name: true } } },
      });
    }
    return this.prisma.projectBooking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        notes: notes?.trim() || booking.notes,
        unit: { update: { status: 'AVAILABLE' } },
      },
      include: { project: true, unit: true, buyer: { select: { id: true, name: true } } },
    });
  }
}
