import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

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
}

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

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
  async update(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: user.sub },
      data: {
        name: dto.name,
        email: dto.email,
        serviceAreas: dto.serviceAreas,
        reraId: dto.reraId,
      },
      select: { id: true, name: true, email: true, role: true, serviceAreas: true, reraId: true },
    });
  }

  @Put('role')
  async role(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateRoleDto) {
    return this.prisma.user.update({
      where: { id: user.sub },
      data: { role: dto.role },
      select: { id: true, role: true },
    });
  }

  @Put('onboarding')
  async onboarding(@CurrentUser() user: JwtPayloadUser, @Body() dto: OnboardingDto) {
    return this.prisma.user.update({
      where: { id: user.sub },
      data: { onboardingStep: dto.step ?? 'complete' },
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

  @Get(':id/trust-score')
  async trustScore(@Param('id') id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: { trustScore: true, verified: true },
    });
    if (!u) return null;
    return { trustScore: u.trustScore, verified: u.verified };
  }
}
