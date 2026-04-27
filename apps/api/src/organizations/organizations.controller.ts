import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { OrgRole } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OrganizationsService } from './organizations.service';

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

class CreateInviteDto {
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUses?: number;
}

class JoinOrgDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  token?: string;
}

class SwitchOrgDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  async create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateOrgDto) {
    return this.organizations.createOrganization(user.sub, dto);
  }

  @Get('mine')
  async mine(@CurrentUser() user: JwtPayloadUser) {
    return this.organizations.listMemberships(user.sub);
  }

  @Get('active')
  async active(@CurrentUser() user: JwtPayloadUser) {
    return this.organizations.getActiveOrganization(user.sub);
  }

  @Post('switch')
  async switchActive(@CurrentUser() user: JwtPayloadUser, @Body() dto: SwitchOrgDto) {
    return this.organizations.switchActiveOrganization(user.sub, dto.organizationId);
  }

  @Post('invites')
  async createInvite(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateInviteDto) {
    return this.organizations.createInvite(user.sub, dto);
  }

  @Get('invites')
  async listInvites(@CurrentUser() user: JwtPayloadUser) {
    return this.organizations.listInvitesForUser(user.sub);
  }

  @Post('join')
  async join(@CurrentUser() user: JwtPayloadUser, @Body() dto: JoinOrgDto) {
    return this.organizations.joinOrganization(user.sub, dto);
  }
}
