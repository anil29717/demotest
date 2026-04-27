import { Module } from '@nestjs/common';
import { CrawlerAdminController } from './crawler-admin.controller';

@Module({
  controllers: [CrawlerAdminController],
})
export class CrawlerAdminModule {}

