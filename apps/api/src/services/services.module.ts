import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [ServicesController],
})
export class ServicesModule {}
