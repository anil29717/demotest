import { Module } from '@nestjs/common';
import { NdasController } from './ndas.controller';

@Module({
  controllers: [NdasController],
})
export class NdasModule {}
