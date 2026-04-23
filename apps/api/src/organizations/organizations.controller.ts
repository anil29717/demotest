import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrgRole } from '@prisma/client';

class CreateOrgDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  reraNumber?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateOrgDto) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        reraNumber: dto.reraNumber,
        gstNumber: dto.gstNumber,
        members: {
          create: { userId: user.sub, role: OrgRole.ADMIN },
        },
      },
    });
    return org;
  }

  @Get('mine')
  async mine(@CurrentUser() user: JwtPayloadUser) {
    return this.prisma.organizationMember.findMany({
      where: { userId: user.sub },
      include: { organization: true },
    });
  }
}
