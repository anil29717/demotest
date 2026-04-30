import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { OrgRole, UserRole } from '@prisma/client';
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
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

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

class UpdateOrgDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  reraNumber?: string | null;

  @IsOptional()
  @IsString()
  gstNumber?: string | null;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Post('invites/:id/revoke')
  async revokeInvite(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') inviteId: string,
  ) {
    return this.organizations.revokeInvite(user.sub, inviteId);
  }

  @Post('join')
  async join(@CurrentUser() user: JwtPayloadUser, @Body() dto: JoinOrgDto) {
    return this.organizations.joinOrganization(user.sub, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrgDto,
  ) {
    return this.organizations.updateOrganization(user.sub, id, dto);
  }

  @Get('admin/list')
  @Roles(UserRole.ADMIN)
  async adminList() {
    return this.organizations.adminListOrganizations();
  }
}
