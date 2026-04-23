import { Module } from '@nestjs/common';
import { FraudController } from './fraud.controller';

@Module({
  controllers: [FraudController],
})
export class FraudModule {}
