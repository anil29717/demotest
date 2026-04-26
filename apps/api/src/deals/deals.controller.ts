import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateDealDto) {
    return this.deals.create(user.sub, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  async list(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId?: string,
  ) {
    if (organizationId)
      return this.deals.listForOrganizationUser(user.sub, organizationId);
    return this.deals.listForUser(user.sub);
  }

  @Get(':id')
  async one(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.getOne(id, user.sub);
  }

  @Get(':id/timeline')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUYER)
  timeline(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.timeline(id, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  patch(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.deals.patch(user.sub, id, dto);
  }

  @Post(':id/advance')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  advance(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.advance(user.sub, id);
  }
}
