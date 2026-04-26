import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  SearchAutocompleteQueryDto,
  SearchPropertiesQueryDto,
  SearchRunSavedQueryDto,
} from './dto/search-properties-query.dto';
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
  async searchProperties(
    @Query() query: SearchPropertiesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.searchService.searchPropertiesQuery(query);
    if (result.fallback) {
      res.setHeader('X-Search-Fallback', 'true');
    }
    return {
      hits: result.hits,
      total: result.total,
      tookMs: result.tookMs,
      note: result.note,
      fallback: result.fallback,
    };
  }

  @Get('autocomplete')
  autocomplete(@Query() query: SearchAutocompleteQueryDto) {
    return this.searchService.autocompleteSuggestions(query.q, query.field);
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
  runSaved(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Query() opts: SearchRunSavedQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.searchService
      .runSavedSearch(user.sub, id, {
        page: opts.page,
        limit: opts.limit,
        sort: opts.sort,
      })
      .then((result) => {
        if (result.fallback) {
          res.setHeader('X-Search-Fallback', 'true');
        }
        return {
          hits: result.hits,
          total: result.total,
          tookMs: result.tookMs,
          note: result.note,
          fallback: result.fallback,
        };
      });
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
