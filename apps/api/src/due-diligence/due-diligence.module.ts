import { Module } from '@nestjs/common';
import { DueDiligenceController } from './due-diligence.controller';

@Module({
  controllers: [DueDiligenceController],
})
export class DueDiligenceModule {}
