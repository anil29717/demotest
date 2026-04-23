import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
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
  searchProperties(@Query('q') q: string) {
    return this.searchService.searchProperties(q ?? '');
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  listSaved(@CurrentUser() user: JwtPayloadUser) {
    return this.searchService.listSaved(user.sub);
  }

  @Post('saved')
  @UseGuards(JwtAuthGuard)
  createSaved(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateSavedSearchDto) {
    return this.searchService.createSaved(user.sub, dto.name, dto.filters);
  }

  @Delete('saved/:id')
  @UseGuards(JwtAuthGuard)
  deleteSaved(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.searchService.deleteSaved(user.sub, id);
  }
}
