import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertySearchIndexService } from './property-search-index.service';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [SearchController],
  providers: [PropertySearchIndexService, SearchService],
  exports: [PropertySearchIndexService, SearchService],
})
export class SearchModule {}
