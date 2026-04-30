import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceRequestStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ServicesService } from './services.service';

class AssignPartnerDto {
  @IsString()
  @IsNotEmpty()
  partnerId!: string;
}

class UpdateServiceRequestStatusDto {
  @IsEnum(ServiceRequestStatus)
  status!: ServiceRequestStatus;
}

class CreateServiceRequestDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsIn(['legal', 'loan', 'insurance'])
  type!: 'legal' | 'loan' | 'insurance';

  @IsOptional()
  @IsString()
  dealId?: string;
}

@Controller('services')
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
export class ServicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly services: ServicesService,
  ) {}

  /** M24–M26 — catalog of partner-service verticals (requests via POST /services/requests). */
  @Get('catalog')
  catalog() {
    return {
      verticals: [
        {
          type: 'legal',
          label: 'Legal partner intake',
          defaultSlaDays: 5,
        },
        {
          type: 'loan',
          label: 'Loan / financing',
          defaultSlaDays: 10,
        },
        {
          type: 'insurance',
          label: 'Insurance placement',
          defaultSlaDays: 7,
        },
      ],
      statuses: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    };
  }

  @Post('requests')
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.services.createRequest(user.sub, dto);
  }

  @Get('requests')
  async list(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.services.listForOrg(user.sub, organizationId);
  }

  @Put('requests/:id/status')
  async updateRequestStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceRequestStatusDto,
  ) {
    return this.services.updateRequestStatus(user.sub, id, dto.status);
  }

  @Put('requests/:id/partner')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  async assignPartner(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: AssignPartnerDto,
  ) {
    return this.services.assignPartner(user.sub, id, dto.partnerId);
  }

  /** Deal-scoped list (same shape as timeline services). */
  @Get('requests/by-deal/:dealId')
  async listByDeal(
    @CurrentUser() user: JwtPayloadUser,
    @Param('dealId') dealId: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: {
        id: dealId,
        OR: [
          { requirement: { userId: user.sub } },
          {
            organization: {
              members: { some: { userId: user.sub } },
            },
          },
        ],
      },
      select: { id: true },
    });
    if (!deal) throw new NotFoundException();
    return this.services.findManyWithIncludes({ dealId });
  }
}
