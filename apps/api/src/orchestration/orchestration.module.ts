import { Module } from '@nestjs/common';
import { ComplianceModule } from '../compliance/compliance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TransactionOrchestrationService } from './transaction-orchestration.service';

@Module({
  imports: [ComplianceModule, NotificationsModule],
  providers: [TransactionOrchestrationService],
  exports: [TransactionOrchestrationService],
})
export class OrchestrationModule {}
