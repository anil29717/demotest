import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { IsNotEmpty, IsString } from 'class-validator';
import { FraudService } from './fraud.service';

class DuplicateCheckDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;
}

/** Modules 19–20 — duplicate/geo checks (Phase 1 heuristic stub) */
@Controller('fraud')
@UseGuards(JwtAuthGuard)
export class FraudController {
  constructor(private readonly fraud: FraudService) {}

  @Get('listing-velocity/me')
  async listingVelocityMe(@CurrentUser() user: JwtPayloadUser) {
    const r = await this.fraud.listingCreationVelocity(user.sub);
    return {
      ...r,
      windowHours: 1,
      note: 'Elevated if more than 5 listings in the last hour.',
    };
  }

  @Post('duplicate-check')
  async duplicateCheck(@Body() dto: DuplicateCheckDto) {
    const r = await this.fraud.duplicateListingRisk(dto.propertyId);
    return {
      ...r,
      note: 'Phase 2: embedding + image hash dedupe',
    };
  }
}
