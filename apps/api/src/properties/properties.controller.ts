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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class UpdatePropertyStatusDto {
  @IsString()
  @IsIn(['active', 'inactive', 'sold', 'withdrawn'])
  status!: 'active' | 'inactive' | 'sold' | 'withdrawn';
}

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

  @Get('check-hash')
  checkHash(@Query('hash') hash?: string) {
    return this.properties.checkHash(hash);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.INSTITUTIONAL_SELLER,
  )
  mine(@CurrentUser() user: JwtPayloadUser) {
    return this.properties.listMine(user.sub);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.INSTITUTIONAL_SELLER,
  )
  updateStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyStatusDto,
  ) {
    return this.properties.updateStatus(user, id, dto.status);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.INSTITUTIONAL_SELLER,
  )
  updateListing(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.properties.updateListing(user, id, dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.properties.getPublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.INSTITUTIONAL_SELLER,
  )
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreatePropertyDto) {
    return this.properties.create(user.sub, dto);
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.INSTITUTIONAL_SELLER,
  )
  uploadUrl(@CurrentUser() user: JwtPayloadUser, @Body() dto: UploadUrlDto) {
    return this.properties.createUploadUrl(
      user.sub,
      dto.fileName,
      dto.contentType,
    );
  }
}
