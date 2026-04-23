import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateDealDto) {
    return this.deals.create(user.sub, dto);
  }

  @Get()
  async list(@CurrentUser() user: JwtPayloadUser, @Query('organizationId') organizationId?: string) {
    if (organizationId) return this.deals.list(organizationId);
    return this.deals.listForUser(user.sub);
  }

  @Get(':id')
  async one(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.getOne(id, user.sub);
  }

  @Get(':id/timeline')
  timeline(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.timeline(id, user.sub);
  }

  @Patch(':id')
  patch(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.deals.patch(user.sub, id, dto);
  }

  @Post(':id/advance')
  advance(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.advance(user.sub, id);
  }
}
