import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { FraudService } from './fraud.service';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

class CreateFraudCaseDto {
  @IsOptional()
  @IsString()
  subjectUserId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  score?: number;
}

class UpdateFraudCaseDto {
  @IsIn(['open', 'review', 'blocked', 'cleared'])
  status!: 'open' | 'review' | 'blocked' | 'cleared';
}

@Controller('admin/fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class FraudAdminController {
  constructor(private readonly fraud: FraudService) {}

  @Get('cases')
  list() {
    return this.fraud.listCases(200);
  }

  @Post('cases')
  create(@Body() dto: CreateFraudCaseDto) {
    return this.fraud.createCase({
      subjectUserId: dto.subjectUserId,
      propertyId: dto.propertyId,
      dealId: dto.dealId,
      reason: dto.reason,
      score: dto.score,
    });
  }

  @Patch('cases/:id')
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateFraudCaseDto,
  ) {
    return this.fraud.setCaseStatus({
      caseId: id,
      adminUserId: user.sub,
      status: dto.status,
    });
  }
}
