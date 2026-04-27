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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrganizationsService } from '../organizations/organizations.service';

class AssignPartnerDto {
  @IsString()
  @IsNotEmpty()
  partnerId!: string;
}

class UpdateServiceRequestStatusDto {
  @IsIn(['open', 'assigned', 'in_progress', 'completed', 'cancelled'])
  status!: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
}

class CreateServiceRequestDto {
  @IsOptional()
  @IsString()
  organizationId!: string;

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
    private readonly organizations: OrganizationsService,
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
    };
  }

  @Post('requests')
  create(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.organizations
      .resolveOrganizationIdForUser(user.sub, dto.organizationId)
      .then((orgId) => {
        if (!orgId) throw new ForbiddenException('Organization access required');
        return this.prisma.serviceRequest.create({
          data: {
            organizationId: orgId,
            dealId: dto.dealId,
            type: dto.type,
            status: 'open',
          },
        });
      });
  }

  @Get('requests')
  async list(
    @CurrentUser() user: JwtPayloadUser,
    @Query('organizationId') organizationId?: string,
  ) {
    const resolved = await this.organizations.resolveOrganizationIdForUser(
      user.sub,
      organizationId,
    );
    if (!resolved) return [];
    return this.prisma.serviceRequest.findMany({
      where: { organizationId: resolved },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Put('requests/:id/status')
  async updateRequestStatus(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceRequestStatusDto,
  ) {
    const row = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.sub, organizationId: row.organizationId },
    });
    if (!member) throw new ForbiddenException();
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  @Put('requests/:id/partner')
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  async assignPartner(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id') id: string,
    @Body() dto: AssignPartnerDto,
  ) {
    const row = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: user.sub, organizationId: row.organizationId },
    });
    if (!member) throw new ForbiddenException();
    return this.prisma.serviceRequest.update({
      where: { id },
      data: { partnerId: dto.partnerId, status: 'assigned' },
    });
  }
}
