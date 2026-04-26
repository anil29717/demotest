import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappOutboundService } from './whatsapp-outbound.service';
import { WhatsappWebhookMetricsService } from './whatsapp-webhook-metrics.service';
import { IsNotEmpty, IsString } from 'class-validator';

class TestOutboundDto {
  @IsString()
  @IsNotEmpty()
  to!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;
}

@Controller('admin/whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class WhatsappAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: WhatsappWebhookMetricsService,
    private readonly outbound: WhatsappOutboundService,
  ) {}

  @Get('metrics')
  metricsSnapshot() {
    return this.metrics.snapshot();
  }

  @Get('nlp-stats')
  async nlpStats() {
    const total = await this.prisma.whatsAppIngest.count();
    const withNlp = await this.prisma.whatsAppIngest.count({
      where: { nlpIntent: { not: null } },
    });
    const intents = await this.prisma.whatsAppIngest.groupBy({
      by: ['nlpIntent'],
      where: { nlpIntent: { not: null } },
      _count: { _all: true },
    });
    const avg = await this.prisma.whatsAppIngest.aggregate({
      where: { nlpConfidence: { not: null } },
      _avg: { nlpConfidence: true },
    });
    const routed = await this.prisma.whatsAppIngest.count({
      where: { routingStatus: 'ROUTED' },
    });
    const skipped = await this.prisma.whatsAppIngest.count({
      where: { routingStatus: 'SKIPPED' },
    });
    const failed = await this.prisma.whatsAppIngest.count({
      where: { routingStatus: 'FAILED' },
    });
    const denom = routed + skipped + failed;
    return {
      totalMessages: total,
      nlpClassified: withNlp,
      intentBreakdown: intents.map((i) => ({
        intent: i.nlpIntent,
        count: i._count._all,
      })),
      avgConfidence: avg._avg.nlpConfidence ?? 0,
      routingRouted: routed,
      routingSkipped: skipped,
      routingFailed: failed,
      routingSuccessRate: denom > 0 ? routed / denom : 0,
    };
  }

  @Get('ingests')
  async recentIngests(@Query('take') takeRaw?: string) {
    const take = Math.min(100, Math.max(1, parseInt(takeRaw ?? '30', 10) || 30));
    return this.prisma.whatsAppIngest.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        dedupeKey: true,
        intent: true,
        messageType: true,
        fromWaId: true,
        leadId: true,
        messageText: true,
        nlpIntent: true,
        nlpConfidence: true,
        nlpExtracted: true,
        routingStatus: true,
        routedAt: true,
        createdLeadId: true,
        createdRequirementId: true,
        createdAt: true,
      },
    });
  }

  @Post('test-outbound')
  async testOutbound(@Body() dto: TestOutboundDto) {
    if (process.env.FEATURE_WHATSAPP_OUTBOUND === 'false') {
      return { sent: false, detail: 'FEATURE_WHATSAPP_OUTBOUND=false' };
    }
    return this.outbound.sendTextMessage(dto.to, dto.body);
  }
}
