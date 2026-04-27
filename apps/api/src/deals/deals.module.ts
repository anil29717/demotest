import { Module, forwardRef } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { ChatModule } from '../chat/chat.module';
import { MatchingModule } from '../matching/matching.module';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { DealScoreService } from './deal-score.service';

@Module({
  imports: [
    OrchestrationModule,
    BillingModule,
    MatchingModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [DealsController],
  providers: [DealsService, DealScoreService],
})
export class DealsModule {}
