import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
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

  /** Masked preview without auth (public marketing pages) — must be before :id */
  @Get('preview/:id')
  preview(@Param('id') id: string) {
    return this.institutions.publicPreview(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  detail(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.institutions.detailForUser(id, user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateInstitutionDto) {
    return this.prisma.institution.create({
      data: {
        postedById: user.sub,
        institutionName: dto.institutionName,
        institutionType: dto.institutionType,
        city: dto.city,
        maskedSummary: dto.maskedSummary ?? 'K-12 / Higher-Ed asset (confidential)',
        askingPriceCr: dto.askingPriceCr,
        studentEnrollment: dto.studentEnrollment,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }
}
