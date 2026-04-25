import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MatchStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MatchingService } from './matching.service';
import { IsEnum } from 'class-validator';

class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status!: MatchStatus;
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
  constructor(private readonly matching: MatchingService) {}

  @Get('me')
  mine(@CurrentUser() user: JwtPayloadUser) {
    return this.matching.listForUser(user.sub);
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
  updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateMatchStatusDto,
  ) {
    return this.matching.updateStatus(user.sub, id, dto.status);
  }
}
