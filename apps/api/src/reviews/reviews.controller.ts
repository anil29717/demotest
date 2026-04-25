import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

class CreateReviewDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

class ModerateDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}

class DisputeReviewDto {
  @IsString()
  reason!: string;
}

class CreatePropertyReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('target/:id')
  listForTarget(@Param('id') targetUserId: string) {
    return this.prisma.review.findMany({
      where: { targetUserId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewerId: true,
      },
    });
  }

  @Get('property/:id')
  listForProperty(@Param('id') propertyId: string) {
    return this.prisma.review.findMany({
      where: { propertyId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewerId: true,
      },
    });
  }

  @Post()
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
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateReviewDto) {
    if (!dto.targetUserId)
      throw new ForbiddenException('targetUserId is required');
    return this.prisma.review.create({
      data: {
        reviewerId: user.sub,
        targetUserId: dto.targetUserId,
        propertyId: dto.propertyId,
        rating: dto.rating,
        comment: dto.comment,
        status: 'pending',
      },
    });
  }

  @Post('property/:id')
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
  async createForProperty(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') propertyId: string,
    @Body() dto: CreatePropertyReviewDto,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { postedById: true },
    });
    if (!property) throw new ForbiddenException('Property not found');
    return this.prisma.review.create({
      data: {
        reviewerId: user.sub,
        targetUserId: property.postedById,
        propertyId,
        rating: dto.rating,
        comment: dto.comment,
        status: 'pending',
      },
    });
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async pending(@CurrentUser() user: JwtPayloadUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException();
    return this.prisma.review.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: {
        reviewer: { select: { id: true, role: true } },
        target: { select: { id: true, role: true } },
      },
    });
  }

  @Put('dispute/:id')
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
  async dispute(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: DisputeReviewDto,
  ) {
    const r = await this.prisma.review.findUnique({
      where: { id },
      select: { targetUserId: true, status: true, comment: true },
    });
    if (!r) throw new ForbiddenException('Review not found');
    if (r.targetUserId !== user.sub && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the review subject may dispute');
    }
    const prev = r.comment?.trim() ? `${r.comment}\n` : '';
    return this.prisma.review.update({
      where: { id },
      data: {
        status: 'disputed',
        comment: `${prev}DISPUTE: ${dto.reason}`,
      },
    });
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async moderate(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: ModerateDto,
  ) {
    if (user.role !== 'ADMIN') throw new ForbiddenException();
    return this.prisma.review.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
