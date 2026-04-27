import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [ExportController],
})
export class ExportModule {}
