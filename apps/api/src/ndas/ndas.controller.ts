import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { NdasService } from './ndas.service';

class SignNdaDto {
  @IsString()
  @IsNotEmpty()
  institutionId!: string;
}

@Controller('nda')
@UseGuards(JwtAuthGuard)
export class NdasController {
  constructor(
    private readonly ndas: NdasService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sign')
  async sign(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: SignNdaDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? '0.0.0.0';
    return this.ndas.sign(user.sub, dto.institutionId, ip);
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
