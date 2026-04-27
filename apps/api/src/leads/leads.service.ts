import { BadRequestException, Injectable } from '@nestjs/common';
import { LeadStatus, Property, Requirement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOrganizationId(userId: string, organizationId?: string) {
    if (organizationId) {
      const member = await this.prisma.organizationMember.findFirst({
        where: { userId, organizationId },
      });
      if (!member)
        throw new BadRequestException('Not a member of organization');
      return organizationId;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });
    if (user?.activeOrganizationId) {
      const activeMembership = await this.prisma.organizationMember.findFirst({
        where: { userId, organizationId: user.activeOrganizationId },
        select: { id: true },
      });
      if (activeMembership) return user.activeOrganizationId;
    }
    const first = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { id: 'asc' },
      select: { organizationId: true },
    });
    return first?.organizationId ?? null;
  }

  async createFromMatchIfBroker(
    property: Property,
    req: Requirement,
    score: number,
  ) {
    if (!property.organizationId) return null;

    const orgId = property.organizationId;
    const existing = await this.prisma.lead.findFirst({
      where: {
        organizationId: orgId,
        propertyId: property.id,
        requirementId: req.id,
      },
      select: { id: true },
    });
    if (existing) return null;

    const owner = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, role: 'ADMIN' },
    });
    const ownerId = owner?.userId ?? property.postedById;

    const buyer = await this.prisma.user.findUnique({
      where: { id: req.userId },
    });

    return this.prisma.lead.create({
      data: {
        organizationId: orgId,
        ownerId,
        leadName: buyer?.name ?? `Requirement ${req.id.slice(0, 6)}`,
        source: `match:${score}`,
        status: score >= 75 ? LeadStatus.HOT : LeadStatus.WARM,
        pipelineStage: 'MATCH',
        propertyId: property.id,
        requirementId: req.id,
      },
    });
  }

  async list(orgId: string) {
    return this.prisma.lead.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 20 },
        followUps: { orderBy: { dueAt: 'asc' }, take: 20 },
      },
    });
  }

  async createManual(
    userId: string,
    dto: {
      organizationId?: string;
      leadName: string;
      source: string;
      status?: LeadStatus;
      pipelineStage?: string;
      propertyId?: string;
      institutionId?: string;
      requirementId?: string;
    },
  ) {
    const organizationId = await this.resolveOrganizationId(
      userId,
      dto.organizationId,
    );
    if (!organizationId)
      throw new BadRequestException('Organization not found');
    return this.prisma.lead.create({
      data: {
        organizationId,
        ownerId: userId,
        leadName: dto.leadName,
        source: dto.source,
        status: dto.status ?? LeadStatus.WARM,
        pipelineStage: dto.pipelineStage ?? 'LEAD',
        propertyId: dto.propertyId,
        institutionId: dto.institutionId,
        requirementId: dto.requirementId,
      },
    });
  }

  async updateLead(
    userId: string,
    id: string,
    dto: {
      status?: LeadStatus;
      pipelineStage?: string;
      leadName?: string;
      source?: string;
    },
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new BadRequestException('Lead not found');
    const org = await this.resolveOrganizationId(userId, lead.organizationId);
    if (!org) throw new BadRequestException('Not authorized');
    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        pipelineStage: dto.pipelineStage,
        leadName: dto.leadName,
        source: dto.source,
      },
    });
  }

  async addNote(userId: string, leadId: string, body: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new BadRequestException('Lead not found');
    const org = await this.resolveOrganizationId(userId, lead.organizationId);
    if (!org) throw new BadRequestException('Not authorized');
    return this.prisma.leadNote.create({
      data: {
        leadId,
        userId,
        body,
      },
    });
  }

  async addFollowUp(
    userId: string,
    leadId: string,
    dueAt: Date,
    note?: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new BadRequestException('Lead not found');
    const org = await this.resolveOrganizationId(userId, lead.organizationId);
    if (!org) throw new BadRequestException('Not authorized');
    return this.prisma.leadFollowUp.create({
      data: {
        leadId,
        userId,
        dueAt,
        note,
      },
    });
  }
}
