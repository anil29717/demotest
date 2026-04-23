import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsNotEmpty()
  storageKey!: string;

  @IsString()
  accessLevel!: string;
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
    return this.prisma.document.create({
      data: {
        dealId: dto.dealId,
        institutionId: dto.institutionId,
        type: dto.type,
        storageKey: dto.storageKey,
        uploadedById: user.sub,
        accessLevel: dto.accessLevel,
      },
    });
  }

  @Get('deal/:dealId')
  listForDeal(@Param('dealId') dealId: string) {
    return this.prisma.document.findMany({ where: { dealId } });
  }

  @Get(':id/presigned-url')
  presigned(@Param('id') id: string) {
    return {
      documentId: id,
      url: `s3://encrypted-bucket/presigned-placeholder/${id}`,
      expiresInSec: 900,
    };
  }
}
