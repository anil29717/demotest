import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ServiceRequestStatus,
  type ServiceRequest,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

export type ServiceRequestHistoryEntry = {
  at: string;
  userId: string;
  userName: string | null;
  action: string;
  detail?: string;
  from?: string;
  to?: string;
  partnerId?: string;
  partnerName?: string;
};

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  private async userLabel(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    return u?.name?.trim() || null;
  }

  private pushHistory(
    current: Prisma.JsonValue | null | undefined,
    entry: ServiceRequestHistoryEntry,
  ): Prisma.InputJsonValue {
    const arr = Array.isArray(current)
      ? ([...current] as ServiceRequestHistoryEntry[])
      : [];
    arr.push(entry);
    return arr as unknown as Prisma.InputJsonValue;
  }

  async createRequest(
    userId: string,
    dto: { organizationId?: string; type: string; dealId?: string },
  ) {
    const orgId = await this.organizations.resolveOrganizationIdForUser(
      userId,
      dto.organizationId,
    );
    if (!orgId) throw new ForbiddenException('Organization access required');
    const name = await this.userLabel(userId);
    const h: ServiceRequestHistoryEntry = {
      at: new Date().toISOString(),
      userId,
      userName: name,
      action: 'CREATED',
      detail: `Requested ${dto.type} service${dto.dealId ? ' (linked to deal)' : ''}`,
    };
    return this.prisma.serviceRequest.create({
      data: {
        organizationId: orgId,
        dealId: dto.dealId,
        type: dto.type,
        status: ServiceRequestStatus.OPEN,
        createdByUserId: userId,
        requestHistory: this.pushHistory(null, h),
      },
    });
  }

  async listForOrg(userId: string, organizationId?: string) {
    const resolved = await this.organizations.resolveOrganizationIdForUser(
      userId,
      organizationId,
    );
    if (!resolved) return [];
    return this.findManyWithIncludes({ organizationId: resolved });
  }

  findManyWithIncludes(where: Prisma.ServiceRequestWhereInput) {
    return this.prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        partner: { select: { id: true, name: true, type: true, city: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateRequestStatus(
    userId: string,
    id: string,
    status: ServiceRequestStatus,
  ) {
    const row = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: row.organizationId },
    });
    if (!member) throw new ForbiddenException();
    const name = await this.userLabel(userId);
    const h: ServiceRequestHistoryEntry = {
      at: new Date().toISOString(),
      userId,
      userName: name,
      action: 'STATUS_CHANGED',
      from: row.status,
      to: status,
      detail: `Status set to ${status}`,
    };
    return this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status,
        requestHistory: this.pushHistory(
          row.requestHistory as Prisma.JsonValue,
          h,
        ),
      },
      include: {
        partner: { select: { id: true, name: true, type: true, city: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async assignPartner(userId: string, id: string, partnerId: string) {
    const row = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: row.organizationId },
    });
    if (!member) throw new ForbiddenException();
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');
    const name = await this.userLabel(userId);
    const h: ServiceRequestHistoryEntry = {
      at: new Date().toISOString(),
      userId,
      userName: name,
      action: 'PARTNER_ASSIGNED',
      partnerId: partner.id,
      partnerName: partner.name,
      detail: `Assigned to ${partner.name} (${partner.type})`,
    };
    const nextStatus =
      row.status === ServiceRequestStatus.COMPLETED
        ? ServiceRequestStatus.COMPLETED
        : ServiceRequestStatus.IN_PROGRESS;
    return this.prisma.serviceRequest.update({
      where: { id },
      data: {
        partnerId,
        status: nextStatus,
        requestHistory: this.pushHistory(
          row.requestHistory as Prisma.JsonValue,
          h,
        ),
      },
      include: {
        partner: { select: { id: true, name: true, type: true, city: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /** Used by partners controller when assigning from deal — creates request + history. */
  async createAssignedFromDeal(params: {
    actorUserId: string;
    organizationId: string;
    dealId: string;
    partnerId: string;
    type: string;
  }): Promise<ServiceRequest> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: params.partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');
    const name = await this.userLabel(params.actorUserId);
    const h1: ServiceRequestHistoryEntry = {
      at: new Date().toISOString(),
      userId: params.actorUserId,
      userName: name,
      action: 'CREATED',
      detail: `Assigned ${partner.name} (${partner.type}) for ${params.type} from deal`,
      partnerId: partner.id,
      partnerName: partner.name,
    };
    const h2: ServiceRequestHistoryEntry = {
      at: new Date().toISOString(),
      userId: params.actorUserId,
      userName: name,
      action: 'PARTNER_ASSIGNED',
      partnerId: partner.id,
      partnerName: partner.name,
      detail: 'Partner assigned — status IN_PROGRESS',
    };
    const history = [h1, h2] as unknown as Prisma.InputJsonValue;
    return this.prisma.serviceRequest.create({
      data: {
        organizationId: params.organizationId,
        dealId: params.dealId,
        type: params.type,
        status: ServiceRequestStatus.IN_PROGRESS,
        partnerId: params.partnerId,
        createdByUserId: params.actorUserId,
        requestHistory: history,
      },
    });
  }
}
