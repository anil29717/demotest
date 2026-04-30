import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';

const ALLOWED_DOC_TYPES = new Set(['AGREEMENT', 'ID_PROOF', 'PROPERTY_DOCS']);
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ALLOWED_DOC_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

class UploadDocDto {
  @IsOptional()
  @IsString()
  dealId?: string;

  @IsOptional()
  @IsString()
  institutionId?: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsOptional()
  storageKey?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsString()
  accessLevel!: string;
}

class CreateDocumentUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Deal room access trail (Module 39) */
  @Get('deal/:dealId/activity')
  dealActivity(@Param('dealId') dealId: string) {
    return this.prisma.activityLog.findMany({
      where: { entityType: 'deal', entityId: dealId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post()
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: UploadDocDto) {
    if (!ALLOWED_DOC_TYPES.has(dto.type)) {
      throw new BadRequestException('Invalid document category');
    }
    const fileUrl = dto.fileUrl || dto.storageKey;
    if (!fileUrl) throw new BadRequestException('fileUrl is required');
    return this.prisma.document.create({
      data: {
        dealId: dto.dealId,
        institutionId: dto.institutionId,
        type: dto.type,
        storageKey: fileUrl,
        uploadedById: user.sub,
        accessLevel: dto.accessLevel,
      },
    });
  }

  @Get('deal/:dealId')
  listForDeal(@Param('dealId') dealId: string) {
    return this.prisma.document.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  @Post('upload-url')
  uploadUrl(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateDocumentUploadUrlDto,
  ) {
    if (!ALLOWED_CONTENT_TYPES.has(dto.contentType)) {
      throw new BadRequestException('Only PDF and image files are allowed');
    }
    const safe = dto.fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `documents/${user.sub}/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`;
    const cdnBase = process.env.MEDIA_CDN_BASE_URL ?? 'https://cdn.example.com';
    return {
      key,
      uploadUrl: `https://upload.example.com/presigned/${encodeURIComponent(key)}`,
      publicUrl: `${cdnBase.replace(/\/+$/, '')}/${key}`,
      method: 'PUT',
      headers: {
        'content-type': dto.contentType,
      },
    };
  }

  @Post('deal/:dealId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'documents');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadDealFile(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
    @Body('type') type: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Missing file');
    if (!ALLOWED_DOC_TYPES.has(type)) {
      throw new BadRequestException('Invalid document category');
    }
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_DOC_EXT.has(ext)) {
      throw new BadRequestException('Only PDF and image files are allowed');
    }
    const base =
      process.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
      `http://localhost:${process.env.PORT ?? 4000}`;
    const fileUrl = `${base}/uploads/documents/${file.filename}`;
    const doc = await this.prisma.document.create({
      data: {
        dealId,
        type,
        storageKey: fileUrl,
        uploadedById: user.sub,
        accessLevel: 'deal_room',
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    return doc;
  }

  @Get(':id/presigned-url')
  async presigned(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    await this.prisma.activityLog.create({
      data: {
        userId: user.sub,
        action: 'DOCUMENT_PRESIGNED_ACCESS',
        entityType: 'document',
        entityId: id,
        metadata: { channel: 'data_room' },
      },
    });
    return {
      documentId: id,
      url: `s3://encrypted-bucket/presigned-placeholder/${id}`,
      expiresInSec: 900,
    };
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    const row = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        uploadedById: true,
        deal: { select: { organizationId: true } },
      },
    });
    if (!row) throw new BadRequestException('Document not found');

    const isUploader = row.uploadedById === user.sub;
    const isAdmin = user.role === UserRole.ADMIN;
    let isOrgBroker = false;
    if (row.deal?.organizationId && user.role === UserRole.BROKER) {
      const m = await this.prisma.organizationMember.findFirst({
        where: { organizationId: row.deal.organizationId, userId: user.sub },
        select: { id: true },
      });
      isOrgBroker = Boolean(m);
    }
    if (!isUploader && !isAdmin && !isOrgBroker) {
      throw new BadRequestException('No access to delete this document');
    }

    await this.prisma.document.delete({ where: { id: row.id } });
    await this.prisma.activityLog.create({
      data: {
        userId: user.sub,
        action: 'DOCUMENT_DELETED',
        entityType: 'document',
        entityId: row.id,
      },
    });
    return { ok: true };
  }
}
