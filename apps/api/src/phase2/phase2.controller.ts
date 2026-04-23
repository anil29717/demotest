import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { IsNumber, IsOptional, IsString } from 'class-validator';

class MlScoreDto {
  @IsString()
  propertyId!: string;

  @IsString()
  requirementId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  baselineScore?: number;
}

/**
 * Phase 2 capability stubs — ML, crawlers, microservices, chat, escrow (compliance review required).
 */
@Controller('phase2')
export class Phase2Controller {
  @Get('status')
  status() {
    return {
      mlMatching: 'stub',
      auctionCrawler: 'stub',
      microservices: 'monolith',
      publicApi: 'stub',
      webhooks: 'stub',
      inAppChat: 'stub',
      escrow: 'compliance_gated_stub',
      reputationGraph: 'basic_score_only',
    };
  }

  @Post('ml/score-preview')
  @UseGuards(JwtAuthGuard)
  mlScorePreview(@CurrentUser() user: JwtPayloadUser, @Body() dto: MlScoreDto) {
    const base = dto.baselineScore ?? 72;
    return {
      userId: user.sub,
      propertyId: dto.propertyId,
      requirementId: dto.requirementId,
      modelVersion: 'stub-0.0.0',
      score: Math.min(99, base + 3),
      factors: ['geo_proximity', 'budget_fit', 'urgency'],
      note: 'Replace with trained model + feature store',
    };
  }

  @Post('auction-crawler/trigger')
  @UseGuards(JwtAuthGuard)
  crawlerTrigger(@CurrentUser() user: JwtPayloadUser) {
    return {
      queued: true,
      jobId: `crawl-${user.sub.slice(0, 6)}`,
      note: 'Wire BullMQ + bank portal adapters in Phase 2',
    };
  }

  @Post('chat/thread')
  @UseGuards(JwtAuthGuard)
  chatThread(@CurrentUser() user: JwtPayloadUser) {
    return {
      threadId: `thread_stub_${user.sub.slice(0, 8)}`,
      note: 'Phase 2: WebSocket + message persistence',
    };
  }

  @Post('escrow/intent')
  @UseGuards(JwtAuthGuard)
  escrowIntent(@CurrentUser() user: JwtPayloadUser) {
    return {
      state: 'blocked_compliance_review',
      userId: user.sub,
      message: 'Escrow requires legal/compliance sign-off before activation',
    };
  }
}
