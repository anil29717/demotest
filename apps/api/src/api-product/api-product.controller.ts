import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiProductService } from './api-product.service';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsIn(['FREE', 'PRO', 'BUSINESS'])
  plan?: 'FREE' | 'PRO' | 'BUSINESS';

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

@Controller('api-product')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiProductController {
  constructor(private readonly service: ApiProductService) {}

  @Get('keys')
  listMine(@CurrentUser() user: JwtPayloadUser) {
    return this.service.listMine(user.sub);
  }

  @Post('keys')
  createKey(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateApiKeyDto) {
    return this.service.createKey(user.sub, {
      name: dto.name,
      plan: dto.plan,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  @Delete('keys/:id')
  revokeKey(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.service.revokeKey(user.sub, id);
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  adminStats() {
    return this.service.adminStats();
  }
}

