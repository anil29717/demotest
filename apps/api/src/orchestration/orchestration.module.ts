import { Module } from '@nestjs/common';
import { ComplianceModule } from '../compliance/compliance.module';
import { TransactionOrchestrationService } from './transaction-orchestration.service';

@Module({
  imports: [ComplianceModule],
  providers: [TransactionOrchestrationService],
  exports: [TransactionOrchestrationService],
})
export class OrchestrationModule {}
