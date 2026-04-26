import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ChatService } from './chat.service';

const ALLOWED_EXT = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.mp4',
]);

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  async listThreads(@CurrentUser() user: JwtPayloadUser) {
    return this.chat.getUserThreads(user.sub);
  }

  @Get('threads/:threadId/messages')
  async listMessages(
    @CurrentUser() user: JwtPayloadUser,
    @Param('threadId') threadId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number(limit) : undefined;
    return this.chat.getThreadMessages(threadId, user.sub, {
      cursor,
      limit: Number.isFinite(lim) ? lim : undefined,
    });
  }

  @Post('threads/deal/:dealId')
  async openDealThread(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    return this.chat.getOrCreateDealThread(dealId, user.sub);
  }

  @Post('threads/direct/:userId')
  async openDirectThread(
    @CurrentUser() user: JwtPayloadUser,
    @Param('userId') otherUserId: string,
  ) {
    return this.chat.getOrCreateDirectThread(user.sub, otherUserId);
  }

  @Delete('messages/:messageId')
  async removeMessage(
    @CurrentUser() user: JwtPayloadUser,
    @Param('messageId') messageId: string,
  ) {
    return this.chat.deleteMessage(messageId, user.sub);
  }

  @Post('threads/:threadId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'chat');
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadChatFile(
    @CurrentUser() user: JwtPayloadUser,
    @Param('threadId') threadId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Missing file');
    const maxB = this.chat.maxFileBytes();
    if (file.size > maxB) {
      throw new BadRequestException(
        `File exceeds limit of ${Math.round(maxB / 1024 / 1024)} MB`,
      );
    }
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException('File type not allowed');
    }
    const base =
      process.env.PUBLIC_API_BASE_URL?.replace(/\/$/, '') ??
      `http://localhost:${process.env.PORT ?? 4000}`;
    const fileUrl = `${base}/uploads/chat/${file.filename}`;
    return this.chat.createFileMessage(
      threadId,
      user.sub,
      fileUrl,
      file.originalname,
      file.size,
    );
  }

  @Get('admin/threads/:threadId/messages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminThread(
    @Param('threadId') threadId: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? Number(limit) : 100;
    return this.chat.adminGetThreadMessages(
      threadId,
      Number.isFinite(lim) ? lim : 100,
    );
  }
}
