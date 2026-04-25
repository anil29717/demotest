import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

class InvestorPreferenceDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assetClasses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geography?: string[];

  @IsOptional()
  @IsNumber()
  minTicketCr?: number;

  @IsOptional()
  @IsNumber()
  maxTicketCr?: number;
}

@Controller('irm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.HNI, UserRole.NRI)
export class IrmController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('preferences')
  get(@CurrentUser() user: JwtPayloadUser) {
    return this.prisma.investorPreference.findUnique({
      where: { userId: user.sub },
    });
  }

  @Put('preferences')
  upsert(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: InvestorPreferenceDto,
  ) {
    return this.prisma.investorPreference.upsert({
      where: { userId: user.sub },
      create: {
        userId: user.sub,
        assetClasses: dto.assetClasses ?? [],
        geography: dto.geography ?? [],
        minTicketCr: dto.minTicketCr,
        maxTicketCr: dto.maxTicketCr,
      },
      update: {
        assetClasses: dto.assetClasses,
        geography: dto.geography,
        minTicketCr: dto.minTicketCr,
        maxTicketCr: dto.maxTicketCr,
      },
    });
  }
}
