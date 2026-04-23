import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
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
export class PartnersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.partner.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: { type: dto.type, name: dto.name, verified: false },
    });
  }
}
