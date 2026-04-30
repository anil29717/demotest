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
import { DealStage, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class AdvanceDealDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  remark!: string;
}

class MoveBackDealDto {
  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  remark!: string;
}

class UpdateStageTaskDto {
  @IsEnum(DealStage)
  stage!: DealStage;

  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class CreateOfferDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  amountInr!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class AddDealNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note!: string;
}

@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreateDealDto) {
    return this.deals.create(user.sub, dto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.INSTITUTIONAL_BUYER,
    UserRole.INSTITUTIONAL_SELLER,
  )
  async list(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId?: string,
  ) {
    if (organizationId)
      return this.deals.listForOrganizationUser(user.sub, organizationId);
    return this.deals.listForUser(user.sub);
  }

  @Get(':id')
  async one(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.getOne(id, user.sub);
  }

  @Get(':id/timeline')
  @Roles(
    UserRole.ADMIN,
    UserRole.BROKER,
    UserRole.BUYER,
    UserRole.SELLER,
    UserRole.INSTITUTIONAL_BUYER,
    UserRole.INSTITUTIONAL_SELLER,
  )
  timeline(@CurrentUser() user: JwtPayloadUser, @Param('id') id: string) {
    return this.deals.timeline(id, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  patch(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.deals.patch(user.sub, id, dto);
  }

  @Post(':id/advance')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  advance(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: AdvanceDealDto,
  ) {
    return this.deals.advance(user.sub, id, dto.remark);
  }

  @Post(':id/move-back')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  moveBack(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: MoveBackDealDto,
  ) {
    return this.deals.moveBack(user.sub, id, dto.remark);
  }

  @Post(':id/stage-tasks')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  updateStageTask(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateStageTaskDto,
  ) {
    return this.deals.updateStageTask(user.sub, id, dto);
  }

  @Post(':id/offers')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUYER, UserRole.SELLER)
  createOffer(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.deals.createOffer(user.sub, id, dto);
  }

  @Post(':id/notes')
  @Roles(UserRole.ADMIN, UserRole.BROKER, UserRole.BUYER, UserRole.SELLER)
  addNote(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: AddDealNoteDto,
  ) {
    return this.deals.addNote(user.sub, id, dto.note);
  }
}
