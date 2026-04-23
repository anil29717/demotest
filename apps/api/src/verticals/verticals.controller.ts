import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

class CreateAuctionDto {
  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  emdAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  startPrice?: number;
}

class NriDto {
  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  assignedManager?: string;
}

class HniDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ticketMinCr?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ticketMaxCr?: number;
}

@Controller('verticals')
export class VerticalsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: bank auction inventory (Phase 1 manual seed) */
  @Get('auctions')
  auctions() {
    return this.prisma.auctionListing.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  @Get('nri/profile')
  @UseGuards(JwtAuthGuard)
  nriProfile(@CurrentUser() user: JwtPayloadUser) {
    return this.prisma.nriProfile.findUnique({ where: { userId: user.sub } });
  }

  @Put('nri/profile')
  @UseGuards(JwtAuthGuard)
  async upsertNri(@CurrentUser() user: JwtPayloadUser, @Body() dto: NriDto) {
    return this.prisma.nriProfile.upsert({
      where: { userId: user.sub },
      create: { userId: user.sub, country: dto.country, assignedManager: dto.assignedManager },
      update: { country: dto.country, assignedManager: dto.assignedManager },
    });
  }

  @Get('hni/profile')
  @UseGuards(JwtAuthGuard)
  hniProfile(@CurrentUser() user: JwtPayloadUser) {
    return this.prisma.hniProfile.findUnique({ where: { userId: user.sub } });
  }

  @Put('hni/profile')
  @UseGuards(JwtAuthGuard)
  async upsertHni(@CurrentUser() user: JwtPayloadUser, @Body() dto: HniDto) {
    return this.prisma.hniProfile.upsert({
      where: { userId: user.sub },
      create: {
        userId: user.sub,
        ticketMinCr: dto.ticketMinCr,
        ticketMaxCr: dto.ticketMaxCr,
      },
      update: {
        ticketMinCr: dto.ticketMinCr,
        ticketMaxCr: dto.ticketMaxCr,
      },
    });
  }

  @Post('auctions')
  @UseGuards(JwtAuthGuard)
  async createAuction(@Body() body: CreateAuctionDto) {
    return this.prisma.auctionListing.create({
      data: {
        source: body.source,
        title: body.title,
        city: body.city,
        emdAmount: body.emdAmount,
        startPrice: body.startPrice,
      },
    });
  }
}
