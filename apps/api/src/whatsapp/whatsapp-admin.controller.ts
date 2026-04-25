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
