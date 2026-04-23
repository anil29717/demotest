import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

/** Module 21 — DD checklist per deal */
@Controller('dd')
@UseGuards(JwtAuthGuard)
export class DueDiligenceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('deal/:dealId/checklist')
  async checklist(@Param('dealId') dealId: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { property: true, institution: true },
    });
    if (!deal) return { error: 'Deal not found' };

    const items = [
      { id: 'title', label: 'Title chain review', done: false },
      { id: 'encumbrance', label: 'Encumbrance certificate', done: false },
      { id: 'rera', label: 'RERA / project registration', done: false },
      ...(deal.institutionId
        ? [{ id: 'nda', label: 'Institutional NDA signed', done: false }]
        : []),
    ];

    return { dealId, stage: deal.stage, items };
  }
}
