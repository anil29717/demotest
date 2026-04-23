import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { OrchestrationModule } from '../orchestration/orchestration.module';

@Module({
  imports: [OrchestrationModule],
  controllers: [DealsController],
  providers: [DealsService],
})
export class DealsModule {}
