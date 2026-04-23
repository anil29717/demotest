import { Module } from '@nestjs/common';
import { ReputationController } from './reputation.controller';

@Module({
  controllers: [ReputationController],
})
export class ReputationModule {}
