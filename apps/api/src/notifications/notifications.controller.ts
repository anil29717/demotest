import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
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
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Stub: 9:30 digest window (WhatsApp provider interface in worker) */
  @Get('digest-preview')
  digestPreview(@CurrentUser() user: JwtPayloadUser) {
    return this.notifications.digestPreview(user.sub);
  }

  @Get()
  list(
    @CurrentUser() user: JwtPayloadUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const take = Math.min(100, Math.max(1, Number(limit ?? '20') || 20));
    const skip = Math.max(0, Number(offset ?? '0') || 0);
    return this.notifications.listForUser(user.sub, take, skip);
  }

  @Put(':id/read')
  read(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
