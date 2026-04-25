import { Module } from '@nestjs/common';
import { FraudAdminController } from './fraud-admin.controller';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';

@Module({
  controllers: [FraudController, FraudAdminController],
  providers: [FraudService],
  exports: [FraudService],
})
export class FraudModule {}
