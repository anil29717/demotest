import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';
import { MatchStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status!: MatchStatus;
}

@Controller('matching')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: JwtPayloadUser) {
    return this.matching.listForUser(user.sub);
  }

  @Post('run/property/:id')
  @UseGuards(JwtAuthGuard)
  runProperty(@Param('id') id: string) {
    return this.matching.runForProperty(id);
  }

  @Post('run/requirement/:id')
  @UseGuards(JwtAuthGuard)
  runRequirement(@Param('id') id: string) {
    return this.matching.runForRequirement(id);
  }

  @Get('property/:id')
  @UseGuards(JwtAuthGuard)
  forProperty(@Param('id') id: string) {
    return this.matching.listForProperty(id);
  }

  @Get('requirement/:id')
  @UseGuards(JwtAuthGuard)
  forRequirement(@Param('id') id: string) {
    return this.matching.listForRequirement(id);
  }

  @Put('matches/:id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateMatchStatusDto,
  ) {
    return this.matching.updateStatus(user.sub, id, dto.status);
  }
}
