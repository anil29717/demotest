import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { BuilderService } from './builder.service';

class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsOptional()
  @IsString()
  locality?: string;

  @IsString()
  @IsNotEmpty()
  reraProjectId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalUnits?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerSqft?: number;

  @IsNumber()
  @Min(1)
  priceMin!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  priceMax?: number;
}

class UpdateProjectDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  locality?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerSqft?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  priceMax?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

class AddUnitDto {
  @IsString()
  @IsNotEmpty()
  unitType!: string;

  @IsString()
  @IsNotEmpty()
  unitNumber!: string;

  @IsOptional()
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  areaSqft?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  price?: number;
}

class BookUnitDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}

class UpdateBookingStatusDto {
  @IsString()
  @IsNotEmpty()
  status!: 'CONFIRMED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('builder')
export class BuilderController {
  constructor(private readonly builder: BuilderService) {}

  @Post('projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUILDER, UserRole.ADMIN)
  createProject(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateProjectDto) {
    return this.builder.createProject(user.sub, dto);
  }

  @Get('projects')
  listProjects(
    @Query('city') city?: string,
    @Query('status') status?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.builder.listProjects({
      city,
      status,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }

  @Get('projects/:id')
  getProject(@Param('id') id: string) {
    return this.builder.getProject(id);
  }

  @Patch('projects/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUILDER, UserRole.ADMIN)
  updateProject(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.builder.updateProject(
      user.sub,
      user.role,
      id,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Post('projects/:id/units')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUILDER, UserRole.ADMIN)
  addUnit(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') projectId: string,
    @Body() dto: AddUnitDto,
  ) {
    return this.builder.addUnit(user.sub, user.role, projectId, dto);
  }

  @Get('projects/:id/units')
  listUnits(@Param('id') projectId: string) {
    return this.builder.listUnits(projectId);
  }

  @Post('projects/:id/units/:unitId/book')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER, UserRole.ADMIN)
  bookUnit(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') projectId: string,
    @Param('unitId') unitId: string,
    @Body() dto: BookUnitDto,
  ) {
    return this.builder.bookUnit(projectId, unitId, user.sub, dto.amount);
  }

  @Get('bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUILDER, UserRole.BUYER, UserRole.ADMIN)
  listBookings(@CurrentUser() user: JwtPayloadUser) {
    return this.builder.listBookings(user.sub, user.role);
  }

  @Post('bookings/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUILDER, UserRole.ADMIN)
  updateBookingStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.builder.updateBookingStatus(
      bookingId,
      user.sub,
      user.role,
      dto.status,
      dto.notes,
    );
  }
}
