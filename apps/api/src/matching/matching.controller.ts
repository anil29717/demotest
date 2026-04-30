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
import { MatchStatus, UserRole } from '@prisma/client';
import { DealsService } from '../deals/deals.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MatchingService } from './matching.service';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status!: MatchStatus;

  @IsOptional()
  @IsBoolean()
  accepted?: boolean;
}

@Controller('matching')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.BROKER,
  UserRole.BUYER,
  UserRole.SELLER,
  UserRole.NRI,
  UserRole.HNI,
  UserRole.INSTITUTIONAL_BUYER,
  UserRole.INSTITUTIONAL_SELLER,
)
export class MatchingController {
  constructor(
    private readonly matching: MatchingService,
    private readonly deals: DealsService,
  ) {}

  @Get('me')
  mine(
    @CurrentUser() user: JwtPayloadUser,
    @Query('hotOnly') hotOnly?: string,
    @Query('heat') heat?: string,
    @Query('minScore') minScore?: string,
    @Query('sort') sort?: string,
  ) {
    const heatRaw = String(heat ?? '').toLowerCase();
    const heatFilter =
      heatRaw === 'hot' || heatRaw === 'normal'
        ? heatRaw
        : hotOnly === 'true' || hotOnly === '1'
          ? 'hot'
          : 'all';
    const parsed =
      minScore != null && String(minScore).trim() !== ''
        ? Number(minScore)
        : undefined;
    const sortRaw = String(sort ?? '').toLowerCase();
    const sortMode =
      sortRaw === 'price_asc' || sortRaw === 'price_desc'
        ? sortRaw
        : ('score' as const);
    return this.matching.listForUser(user.sub, {
      heat: heatFilter,
      minScore:
        parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      sort: sortMode,
    });
  }

  @Post('run/property/:id')
  runProperty(@Param('id') id: string) {
    return this.matching.runForProperty(id);
  }

  @Post('run/requirement/:id')
  runRequirement(@Param('id') id: string) {
    return this.matching.runForRequirement(id);
  }

  @Get('property/:id')
  forProperty(@Param('id') id: string) {
    return this.matching.listForProperty(id);
  }

  @Get('requirement/:id')
  forRequirement(@Param('id') id: string) {
    return this.matching.listForRequirement(id);
  }

  @Put('matches/:id/status')
  async updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateMatchStatusDto,
  ) {
    const updated = await this.matching.updateStatus(user.sub, id, dto.status, {
      accepted: dto.accepted,
    });
    if (
      updated &&
      dto.status === MatchStatus.ACCEPTED &&
      dto.accepted === true
    ) {
      try {
        await this.deals.ensurePipelineFromAcceptedMatch(user.sub, id);
      } catch {
        /* lead/deal side-effect; match status already saved */
      }
    }
    return updated;
  }
}
