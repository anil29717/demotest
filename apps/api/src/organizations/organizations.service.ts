import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgRole, OrganizationInviteStatus } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

type CreateOrgInput = {
  name: string;
  reraNumber?: string;
  gstNumber?: string;
};

type CreateInviteInput = {
  role?: OrgRole;
  expiresInDays?: number;
  maxUses?: number;
};

type JoinOrgInput = {
  code?: string;
  token?: string;
};

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private makeInviteCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  async resolveOrganizationIdForUser(
    userId: string,
    requestedOrganizationId?: string | null,
  ): Promise<string | null> {
    if (requestedOrganizationId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId, organizationId: requestedOrganizationId },
        select: { id: true },
      });
      if (!membership) {
        throw new BadRequestException('Not a member of organization');
      }
      return requestedOrganizationId;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });
    if (user?.activeOrganizationId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId, organizationId: user.activeOrganizationId },
        select: { id: true },
      });
      if (membership) return user.activeOrganizationId;
    }

    const first = await this.prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { id: 'asc' },
      select: { organizationId: true },
    });
    return first?.organizationId ?? null;
  }

  async createOrganization(userId: string, dto: CreateOrgInput) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        reraNumber: dto.reraNumber?.trim() || null,
        gstNumber: dto.gstNumber?.trim() || null,
        members: {
          create: { userId, role: OrgRole.ADMIN },
        },
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: org.id },
    });

    return org;
  }

  async listMemberships(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { id: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      organizationId: m.organizationId,
      role: m.role,
      isActive: m.organizationId === user?.activeOrganizationId,
      organization: m.organization,
    }));
  }

  async getActiveOrganization(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });
    if (!user?.activeOrganizationId) return null;
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: user.activeOrganizationId,
      },
      include: { organization: true },
    });
    if (!member) return null;
    return {
      organizationId: member.organizationId,
      role: member.role,
      organization: member.organization,
    };
  }

  async switchActiveOrganization(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException('Not a member of organization');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: organizationId },
    });
    return { ok: true, activeOrganizationId: organizationId };
  }

  async createInvite(userId: string, dto: CreateInviteInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });
    if (!user?.activeOrganizationId) {
      throw new BadRequestException('Set an active organization first');
    }
    const orgId = user.activeOrganizationId;
    const adminMembership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
      select: { role: true },
    });
    if (!adminMembership || adminMembership.role !== OrgRole.ADMIN) {
      throw new BadRequestException('Only organization admin can create invites');
    }

    const code = this.makeInviteCode();
    const token = randomUUID().replace(/-/g, '');
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    const invite = await this.prisma.organizationInvite.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        code,
        token,
        role: dto.role ?? OrgRole.AGENT,
        maxUses: dto.maxUses ?? 1,
        expiresAt,
      },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
    return {
      ...invite,
      inviteLink: `/onboarding?invite=${invite.token}`,
    };
  }

  async listInvitesForUser(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, role: OrgRole.ADMIN },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (!orgIds.length) return [];
    const invites = await this.prisma.organizationInvite.findMany({
      where: { organizationId: { in: orgIds } },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return invites.map((invite) => ({
      ...invite,
      inviteLink: `/onboarding?invite=${invite.token}`,
    }));
  }

  async joinOrganization(userId: string, dto: JoinOrgInput) {
    const lookupCode = dto.code?.trim().toUpperCase();
    const lookupToken = dto.token?.trim();
    if (!lookupCode && !lookupToken) {
      throw new BadRequestException('Invite code or token is required');
    }

    const invite = await this.prisma.organizationInvite.findFirst({
      where: {
        OR: [
          ...(lookupCode ? [{ code: lookupCode }] : []),
          ...(lookupToken ? [{ token: lookupToken }] : []),
        ],
      },
      include: { organization: true },
    });
    if (!invite) throw new BadRequestException('Invite not found');

    const now = new Date();
    if (invite.status !== OrganizationInviteStatus.PENDING) {
      throw new BadRequestException('Invite is not active');
    }
    if (invite.expiresAt.getTime() < now.getTime()) {
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: OrganizationInviteStatus.EXPIRED },
      });
      throw new BadRequestException('Invite has expired');
    }
    if (invite.usedCount >= invite.maxUses) {
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { status: OrganizationInviteStatus.ACCEPTED },
      });
      throw new BadRequestException('Invite usage limit reached');
    }

    await this.prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
      update: { role: invite.role },
      create: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      },
    });

    const nextUsedCount = invite.usedCount + 1;
    const nextStatus =
      nextUsedCount >= invite.maxUses
        ? OrganizationInviteStatus.ACCEPTED
        : OrganizationInviteStatus.PENDING;

    await this.prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { usedCount: nextUsedCount, status: nextStatus },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { activeOrganizationId: invite.organizationId },
    });

    return {
      ok: true,
      organizationId: invite.organizationId,
      organizationName: invite.organization.name,
      role: invite.role,
    };
  }
}
