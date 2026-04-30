import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceAreas?: string[];

  @IsOptional()
  @IsString()
  reraId?: string;
}

class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;
}

class OnboardingDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  step?: string;
}

const SELF_SERVICE_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.BUYER,
  UserRole.SELLER,
  UserRole.BROKER,
]);

const ONBOARDING_STEPS = [
  'started',
  'profile',
  'verification',
  'complete',
] as const;
type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

class NotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  dailyDigest?: boolean;

  @IsOptional()
  @IsBoolean()
  matchAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  slaWarnings?: boolean;

  @IsOptional()
  @IsBoolean()
  ndaAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  dealAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  alertAlerts?: boolean;

  /** Local hour (0–23) for digest send window preview; omit for default 09:00. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  digestHourLocal?: number;

  /** Local minute (0–59) for digest send window preview; omit for default :30. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  digestMinuteLocal?: number;

  @IsOptional()
  @IsBoolean()
  whatsappDigest?: boolean;

  /** E.164 (e.g. +919876543210). Omit or clear to disable WhatsApp mirror. */
  @IsOptional()
  @ValidateIf((o) => {
    const v = (o as NotificationPrefsDto).whatsappDigestTo;
    return v != null && v !== '';
  })
  @IsString()
  @MaxLength(20)
  @Matches(/^\+[1-9]\d{9,14}$/)
  whatsappDigestTo?: string;

  @IsOptional()
  @IsBoolean()
  emailMatchAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDailyDigest?: boolean;
}

@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('broker-network')
  async brokerNetwork(@CurrentUser() user: JwtPayloadUser) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.sub },
      include: { organization: { select: { id: true, name: true } } },
    });
    return {
      userId: user.sub,
      organizations: memberships.map((m) => ({
        organizationId: m.organizationId,
        name: m.organization.name,
        role: m.role,
      })),
      note: 'Phase 1: flat org roles (ADMIN/AGENT/VIEWER). Territory splits & uplines deferred to Phase 2 unless expanded here.',
    };
  }

  @Get('profile')
  async profile(@CurrentUser() user: JwtPayloadUser) {
    return this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        trustScore: true,
        verified: true,
        serviceAreas: true,
        reraId: true,
        notificationPrefs: true,
        onboardingStep: true,
        reputationScore: true,
        createdAt: true,
      },
    });
  }

  @Put('profile')
  async update(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.prisma.user.update({
      where: { id: user.sub },
      data: {
        name: dto.name,
        email: dto.email,
        serviceAreas: dto.serviceAreas,
        reraId: dto.reraId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        serviceAreas: true,
        reraId: true,
      },
    });
  }

  @Put('role')
  async role(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateRoleDto) {
    if (!SELF_SERVICE_ROLES.has(dto.role)) {
      throw new BadRequestException('Role change not allowed');
    }
    const current = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, serviceAreas: true },
    });
    if (!current) throw new BadRequestException('User not found');
    if (
      current.role !== UserRole.BUYER &&
      current.role !== UserRole.SELLER &&
      current.role !== UserRole.BROKER
    ) {
      throw new BadRequestException(
        'Role change allowed only for core marketplace users',
      );
    }
    if (
      dto.role === UserRole.BROKER &&
      (!current.serviceAreas || current.serviceAreas.length === 0)
    ) {
      throw new BadRequestException(
        'Set service areas before switching to broker',
      );
    }
    return this.prisma.user.update({
      where: { id: user.sub },
      data: { role: dto.role },
      select: { id: true, role: true },
    });
  }

  @Put('onboarding')
  async onboarding(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: OnboardingDto,
  ) {
    const step: OnboardingStep =
      dto.step && (ONBOARDING_STEPS as readonly string[]).includes(dto.step)
        ? (dto.step as OnboardingStep)
        : 'complete';

    if (step === 'complete') {
      const profile = await this.prisma.user.findUnique({
        where: { id: user.sub },
        select: { role: true, serviceAreas: true },
      });
      if (!profile) throw new BadRequestException('User not found');
      if (
        profile.role === UserRole.BROKER &&
        (!profile.serviceAreas || profile.serviceAreas.length === 0)
      ) {
        throw new BadRequestException(
          'Brokers must set at least one service area before completing onboarding',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: user.sub },
      data: { onboardingStep: step },
      select: { id: true, onboardingStep: true },
    });
  }

  @Put('notification-preferences')
  async notificationPrefs(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: NotificationPrefsDto,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { notificationPrefs: true },
    });
    const merged = {
      ...((existing?.notificationPrefs as object) ?? {}),
      ...dto,
    };
    return this.prisma.user.update({
      where: { id: user.sub },
      data: { notificationPrefs: merged },
      select: { id: true, notificationPrefs: true },
    });
  }

  @Get('notification-preferences')
  async getNotificationPrefs(@CurrentUser() user: JwtPayloadUser) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { notificationPrefs: true },
    });
    return (row?.notificationPrefs as Record<string, unknown> | null) ?? {};
  }

  @Get(':id/trust-score')
  async trustScore(@Param('id') id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { trustScore: true, verified: true },
    });
    if (!u) return null;
    return { trustScore: u.trustScore, verified: u.verified };
  }

  @Get('admin/list')
  @Roles(UserRole.ADMIN)
  async adminList(
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(200, Math.max(1, Number(limit ?? 50) || 50));
    const skip = Math.max(0, Number(offset ?? 0) || 0);
    const needle = q?.trim();
    const roleNorm = role?.trim().toUpperCase();
    const roleFilter =
      roleNorm && (Object.values(UserRole) as string[]).includes(roleNorm)
        ? (roleNorm as UserRole)
        : undefined;

    const where = {
      ...(needle
        ? {
            OR: [
              { name: { contains: needle, mode: 'insensitive' as const } },
              { email: { contains: needle, mode: 'insensitive' as const } },
              { id: { contains: needle, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          onboardingStep: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, hasMore: skip + data.length < total };
  }

  @Put('admin/:id/role')
  @Roles(UserRole.ADMIN)
  async adminSetRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, role: true, name: true, email: true },
    });
  }
}
