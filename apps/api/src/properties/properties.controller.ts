import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

class UploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsOptional()
  @IsString()
  contentType?: string;
}

@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Get()
  list() {
    return this.properties.listPublic();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: JwtPayloadUser) {
    return this.properties.listMine(user.sub);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.properties.getPublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreatePropertyDto) {
    return this.properties.create(user.sub, dto);
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  uploadUrl(@CurrentUser() user: JwtPayloadUser, @Body() dto: UploadUrlDto) {
    return this.properties.createUploadUrl(user.sub, dto.fileName, dto.contentType);
  }
}
