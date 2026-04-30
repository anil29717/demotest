import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

class AssignPartnerToDealDto {
  @IsString()
  @IsNotEmpty()
  dealId!: string;

  @IsString()
  @IsNotEmpty()
  partnerId!: string;

  @IsOptional()
  @IsIn(['legal', 'loan', 'insurance'])
  type?: 'legal' | 'loan' | 'insurance';
}

class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;
}

@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesService,
  ) {}

  /** M42 — onboarding / program summary for brokers (static Phase 1 reference). */
  @Get('program/summary')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUILDER)
  programSummary() {
    return {
      tiers: ['registered', 'verified', 'preferred'],
      revenueModel: 'referral_fee_placeholder',
      note: 'Partner verification flows use POST /partners; accounting integration Phase 2.',
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUILDER)
  async list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('vertical') vertical?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    const skip = Math.max(0, parseInt(offset ?? '0', 10) || 0);
    const v = vertical?.trim().toLowerCase();
    const verticalWhere =
      v && ['legal', 'loan', 'insurance'].includes(v)
        ? {
            OR: [
              { type: { equals: v, mode: 'insensitive' as const } },
              { type: { equals: 'all', mode: 'insensitive' as const } },
            ],
          }
        : {};
    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        where: verticalWhere,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.partner.count({ where: verticalWhere }),
    ]);
    return { data, total, hasMore: skip + data.length < total };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUILDER)
  create(@Body() dto: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: {
        type: dto.type,
        name: dto.name,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        city: dto.city?.trim() || null,
        verified: false,
      },
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUILDER)
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.prisma.partner.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
      },
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUILDER)
  async remove(@Param('id') id: string) {
    await this.prisma.partner.delete({ where: { id } });
    return { ok: true };
  }

  @Post(':id/verify')
  @Roles(UserRole.ADMIN)
  async verify(@Param('id') id: string) {
    const row = await this.prisma.partner.update({
      where: { id },
      data: { verified: true },
    });
    return { ok: true, partner: row };
  }

  @Post(':id/unverify')
  @Roles(UserRole.ADMIN)
  async unverify(@Param('id') id: string) {
    const row = await this.prisma.partner.update({
      where: { id },
      data: { verified: false },
    });
    return { ok: true, partner: row };
  }

  @Post('assign-to-deal')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  async assignToDeal(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: AssignPartnerToDealDto,
  ) {
    const [deal, partner] = await Promise.all([
      this.prisma.deal.findUnique({
        where: { id: dto.dealId },
        select: { id: true, organizationId: true },
      }),
      this.prisma.partner.findUnique({
        where: { id: dto.partnerId },
        select: { id: true },
      }),
    ]);

    if (!deal) throw new BadRequestException('Deal not found');
    if (!partner) throw new BadRequestException('Partner not found');

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: deal.organizationId, userId: user.sub },
      select: { id: true },
    });
    if (!member) throw new BadRequestException('Not a member of organization');

    const type = dto.type ?? 'legal';
    const row = await this.services.createAssignedFromDeal({
      actorUserId: user.sub,
      organizationId: deal.organizationId,
      dealId: deal.id,
      partnerId: partner.id,
      type,
    });
    return { ok: true, request: row };
  }
}
