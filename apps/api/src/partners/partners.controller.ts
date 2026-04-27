import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsNotEmpty, IsString } from 'class-validator';

class CreatePartnerDto {
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller('partners')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PartnersController {
  constructor(private readonly prisma: PrismaService) {}

  /** M42 — onboarding / program summary for brokers (static Phase 1 reference). */
  @Get('program/summary')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  programSummary() {
    return {
      tiers: ['registered', 'verified', 'preferred'],
      revenueModel: 'referral_fee_placeholder',
      note: 'Partner verification flows use POST /partners; accounting integration Phase 2.',
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  async list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const take = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    const skip = Math.max(0, parseInt(offset ?? '0', 10) || 0);
    const [data, total] = await Promise.all([
      this.prisma.partner.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.partner.count(),
    ]);
    return { data, total, hasMore: skip + data.length < total };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  create(@Body() dto: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: { type: dto.type, name: dto.name, verified: false },
    });
  }
}
