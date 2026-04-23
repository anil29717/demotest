import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsNotEmpty, IsString } from 'class-validator';

class DuplicateCheckDto {
  @IsString()
  @IsNotEmpty()
  propertyId!: string;
}

/** Modules 19–20 — duplicate/geo checks (Phase 1 heuristic stub) */
@Controller('fraud')
@UseGuards(JwtAuthGuard)
export class FraudController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('duplicate-check')
  async duplicateCheck(@Body() dto: DuplicateCheckDto) {
    const p = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: { city: true, latitude: true, longitude: true, title: true },
    });
    if (!p) return { risk: 'unknown' as const, reason: 'Property not found' };

    const near = await this.prisma.property.count({
      where: {
        id: { not: dto.propertyId },
        city: p.city,
        status: 'active',
      },
    });

    return {
      risk: near > 3 ? ('elevated' as const) : ('low' as const),
      similarListingsInCity: near,
      note: 'Phase 2: embedding + image hash dedupe',
    };
  }
}
