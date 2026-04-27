import { Module } from '@nestjs/common';
import { FraudAdminController } from './fraud-admin.controller';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { OcrService } from './ocr.service';

@Module({
  controllers: [FraudController, FraudAdminController],
  providers: [FraudService, OcrService],
  exports: [FraudService, OcrService],
})
export class FraudModule {}
