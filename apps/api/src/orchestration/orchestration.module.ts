import { Module } from '@nestjs/common';
import { TransactionOrchestrationService } from './transaction-orchestration.service';

@Module({
  providers: [TransactionOrchestrationService],
  exports: [TransactionOrchestrationService],
})
export class OrchestrationModule {}
