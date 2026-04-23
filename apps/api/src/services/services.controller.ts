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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class AssignPartnerDto {
  @IsString()
  @IsNotEmpty()
  partnerId!: string;
}

class CreateServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsIn(['legal', 'loan', 'insurance'])
  type!: 'legal' | 'loan' | 'insurance';

  @IsOptional()
  @IsString()
  dealId?: string;
}

@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('requests')
  create(@CurrentUser() _user: JwtPayloadUser, @Body() dto: CreateServiceRequestDto) {
    return this.prisma.serviceRequest.create({
      data: {
        organizationId: dto.organizationId,
        dealId: dto.dealId,
        type: dto.type,
        status: 'open',
      },
    });
  }

  @Get('requests')
  list(@Query('organizationId') organizationId: string) {
    if (!organizationId) return [];
    return this.prisma.serviceRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Put('requests/:id/partner')
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
