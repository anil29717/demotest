import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { LeadStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

class CreateLeadDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  leadName!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  pipelineStage?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  institutionId?: string;

  @IsOptional()
  @IsString()
  requirementId?: string;
}

class UpdateLeadDto {
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsString()
  pipelineStage?: string;

  @IsOptional()
  @IsString()
  leadName?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

class LeadNoteDto {
  @IsString()
  @IsNotEmpty()
  body!: string;
}

class LeadFollowupDto {
  @Type(() => Date)
  @IsDate()
  dueAt!: Date;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.BROKER)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId: string,
  ) {
    const org = await this.leads.resolveOrganizationId(
      user.sub,
      organizationId,
    );
    if (!org) return [];
    return this.leads.list(org);
  }

  @Post()
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateLeadDto) {
    return this.leads.createManual(user.sub, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leads.updateLead(user.sub, id, dto);
  }

  @Post(':id/notes')
  addNote(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: LeadNoteDto,
  ) {
    return this.leads.addNote(user.sub, id, dto.body);
  }

  @Post(':id/followup')
  addFollowup(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: LeadFollowupDto,
  ) {
    return this.leads.addFollowUp(user.sub, id, dto.dueAt, dto.note);
  }
}
