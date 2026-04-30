import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
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

const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);

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

  @Post('files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.SELLER,
    UserRole.NRI,
    UserRole.INSTITUTIONAL_SELLER,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'properties');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        const okMime =
          file.mimetype === 'image/jpeg' || file.mimetype === 'image/png';
        const okExt = ext === '.jpg' || ext === '.jpeg' || ext === '.png';
        if (!okMime || !okExt) {
          cb(
            new HttpException(
              'Only JPEG and PNG images are allowed (max 15MB)',
              400,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadPropertyFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing file');
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_IMAGE_EXT.has(ext)) {
      throw new BadRequestException('Only image files are allowed');
    }
    const base =
      process.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
      `http://localhost:${process.env.PORT ?? 4000}`;
    return {
      url: `${base}/uploads/properties/${file.filename}`,
      fileName: file.originalname,
    };
  }
}
