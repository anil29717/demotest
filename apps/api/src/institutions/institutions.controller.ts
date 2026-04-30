import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { InstitutionsService } from './institutions.service';
import { PrismaService } from '../prisma/prisma.service';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CreateInstitutionDto {
  @IsString()
  institutionName!: string;

  @IsString()
  institutionType!: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  maskedSummary?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  askingPriceCr!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  studentEnrollment?: number;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;
}

@Controller('institutions')
export class InstitutionsController {
  constructor(
    private readonly institutions: InstitutionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  listMasked() {
    return this.institutions.maskedList();
  }

  /** Masked list + per-user NDA access flags (preferred when authenticated). */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.HNI,
    UserRole.NRI,
    UserRole.BUILDER,
    UserRole.INSTITUTIONAL_BUYER,
    UserRole.INSTITUTIONAL_SELLER,
  )
  listForMe(@CurrentUser() user: JwtPayloadUser) {
    return this.institutions.listWithAccessContext(user);
  }

  /** Masked preview without auth (public marketing pages) — must be before :id */
  @Get('preview/:id')
  preview(@Param('id') id: string) {
    return this.institutions.publicPreview(id);
  }

  @Get(':id/dd-pack')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.HNI,
    UserRole.INSTITUTIONAL_BUYER,
    UserRole.INSTITUTIONAL_SELLER,
  )
  ddPack(@Param('id') id: string, @Request() req: { user: { id?: string; sub?: string } }) {
    return this.institutions.ddPackOutline(id, req.user.id ?? req.user.sub ?? '');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.HNI,
    UserRole.INSTITUTIONAL_BUYER,
    UserRole.INSTITUTIONAL_SELLER,
  )
  detail(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.institutions.detailForUser(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.INSTITUTIONAL_SELLER)
  async create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateInstitutionDto,
  ) {
    return this.prisma.institution.create({
      data: {
        postedById: user.sub,
        institutionName: dto.institutionName,
        institutionType: dto.institutionType,
        city: dto.city,
        maskedSummary:
          dto.maskedSummary ?? 'K-12 / Higher-Ed asset (confidential)',
        askingPriceCr: dto.askingPriceCr,
        studentEnrollment: dto.studentEnrollment,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }
}
