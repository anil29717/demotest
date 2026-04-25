import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { SearchPropertiesQueryDto } from './dto/search-properties-query.dto';
import { SearchService } from './search.service';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

class CreateSavedSearchDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsObject()
  filters!: Record<string, unknown>;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('properties')
  searchProperties(@Query() query: SearchPropertiesQueryDto) {
    return this.searchService.searchPropertiesQuery(query);
  }

  @Post('admin/reindex-properties')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminReindexProperties() {
    return this.searchService.adminReindexElasticsearch();
  }

  @Get('saved')
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
  listSaved(@CurrentUser() user: JwtPayloadUser) {
    return this.searchService.listSaved(user.sub);
  }

  @Post('saved')
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
  createSaved(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateSavedSearchDto,
  ) {
    return this.searchService.createSaved(user.sub, dto.name, dto.filters);
  }

  @Get('saved/:id/run')
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
  runSaved(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.searchService.runSavedSearch(user.sub, id);
  }

  @Delete('saved/:id')
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
  deleteSaved(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.searchService.deleteSaved(user.sub, id);
  }
}
