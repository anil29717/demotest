import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { NdasService } from './ndas.service';

class RequestNdaDto {
  @IsString()
  @IsNotEmpty()
  institutionId!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  organizationName?: string;
}

class ReviewNdaDto {
  @IsString()
  @IsNotEmpty()
  institutionId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}

@Controller('nda')
@UseGuards(JwtAuthGuard)
export class NdasController {
  constructor(
    private readonly ndas: NdasService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('request')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTITUTIONAL_BUYER, UserRole.BROKER)
  async request(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: RequestNdaDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? '0.0.0.0';
    return this.ndas.request(user, dto, ip);
  }

  @Post('approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approve(
    @CurrentUser() admin: JwtPayloadUser,
    @Body() dto: ReviewNdaDto,
  ) {
    return this.ndas.approve(admin.sub, dto);
  }

  @Post('reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reject(
    @CurrentUser() admin: JwtPayloadUser,
    @Body() dto: ReviewNdaDto,
  ) {
    return this.ndas.reject(admin.sub, dto);
  }

  @Get('status')
  status(
    @CurrentUser() user: JwtPayloadUser,
    @Query('institutionId') institutionId: string,
  ) {
    if (!institutionId?.trim()) {
      throw new BadRequestException('institutionId query parameter is required');
    }
    return this.prisma.nda.findUnique({
      where: {
        userId_institutionId: { userId: user.sub, institutionId: institutionId.trim() },
      },
    });
  }

  @Get('requests')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  list(@Query('status') status?: string) {
    const normalizedStatus = (status ?? '').toUpperCase();
    return this.ndas.listRequests(
      normalizedStatus === 'PENDING' ||
        normalizedStatus === 'APPROVED' ||
        normalizedStatus === 'REJECTED'
        ? normalizedStatus
        : undefined,
    );
  }

  @Get('incoming')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.INSTITUTIONAL_SELLER, UserRole.ADMIN)
  incoming(@CurrentUser() user: JwtPayloadUser, @Query('status') status?: string) {
    const normalizedStatus = (status ?? '').toUpperCase();
    return this.ndas.listIncomingForSeller(
      user.sub,
      normalizedStatus === 'PENDING' ||
        normalizedStatus === 'APPROVED' ||
        normalizedStatus === 'REJECTED'
        ? normalizedStatus
        : undefined,
    );
  }
}
