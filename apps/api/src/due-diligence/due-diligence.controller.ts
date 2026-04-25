import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

/** Module 21 — DD checklist per deal */
@Controller('dd')
@UseGuards(JwtAuthGuard)
export class DueDiligenceController {
  constructor(private readonly prisma: PrismaService) {}

  /** Property-scoped DD template (owner, broker, admin, or public active listing). */
  @Get('property/:propertyId/checklist')
  async propertyChecklist(
    @CurrentUser() user: JwtPayloadUser,
    @Param('propertyId') propertyId: string,
  ) {
    const p = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        title: true,
        city: true,
        status: true,
        postedById: true,
        distressedLabel: true,
        isBankAuction: true,
      },
    });
    if (!p) return { error: 'Property not found' };
    const canView =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.BROKER ||
      p.postedById === user.sub ||
      p.status === 'active';
    if (!canView) {
      throw new ForbiddenException('Listing not visible for this account');
    }
    const items = [
      { id: 'title', label: 'Title chain review', done: false },
      { id: 'encumbrance', label: 'Encumbrance certificate', done: false },
      { id: 'rera', label: 'RERA / approvals', done: false },
      ...(p.isBankAuction
        ? [{ id: 'auction', label: 'Auction terms & possession risk', done: false }]
        : []),
      ...(p.distressedLabel === 'high_opportunity'
        ? [{ id: 'special', label: 'Special-situation disclosures', done: false }]
        : []),
    ];
    return { propertyId, city: p.city, title: p.title, items };
  }

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
