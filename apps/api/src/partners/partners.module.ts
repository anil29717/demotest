import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [ServicesModule],
  controllers: [PartnersController],
})
export class PartnersModule {}
