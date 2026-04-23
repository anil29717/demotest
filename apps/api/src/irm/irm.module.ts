import { Module } from '@nestjs/common';
import { IrmController } from './irm.controller';

@Module({
  controllers: [IrmController],
})
export class IrmModule {}
