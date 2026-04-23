import { Controller, Get, UseGuards } from '@nestjs/common';
import { DealStage } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Module 44 — basic reputation from closed deals (Phase 1 simplified) */
@Controller('reputation')
@UseGuards(JwtAuthGuard)
export class ReputationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() user: JwtPayloadUser) {
    const closed = await this.prisma.deal.count({
      where: {
        stage: DealStage.CLOSURE,
        organization: { members: { some: { userId: user.sub } } },
      },
    });
    const score = Math.min(100, 40 + closed * 5);
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { reputationScore: score },
    });
    return {
      userId: user.sub,
      reputationScore: score,
      closedDealsAttributed: closed,
      note: 'Phase 2: graph + co-broker attestations',
    };
  }
}
