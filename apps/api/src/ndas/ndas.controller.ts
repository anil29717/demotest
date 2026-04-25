import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IsNotEmpty, IsString } from 'class-validator';

class SignNdaDto {
  @IsString()
  @IsNotEmpty()
  institutionId!: string;
}

@Controller('nda')
@UseGuards(JwtAuthGuard)
export class NdasController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('sign')
  async sign(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SignNdaDto,
    @Req() req: Request,
  ) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: dto.institutionId },
      select: { id: true },
    });
    if (!institution) throw new BadRequestException('Institution not found');

    const ip = req.ip ?? '0.0.0.0';
    return this.prisma.nda.upsert({
      where: {
        userId_institutionId: {
          userId: user.sub,
          institutionId: dto.institutionId,
        },
      },
      create: {
        userId: user.sub,
        institutionId: dto.institutionId,
        status: 'signed',
        signedAt: new Date(),
        ipAddress: ip,
      },
      update: {
        status: 'signed',
        signedAt: new Date(),
        ipAddress: ip,
      },
    });
  }

  @Get('status')
  status(
    @CurrentUser() user: JwtPayloadUser,
    @Query('institutionId') institutionId: string,
  ) {
    if (!institutionId) return null;
    return this.prisma.nda.findUnique({
      where: {
        userId_institutionId: { userId: user.sub, institutionId },
      },
    });
  }
}
