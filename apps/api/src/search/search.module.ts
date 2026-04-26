import { Module } from '@nestjs/common';
import { PropertySearchIndexService } from './property-search-index.service';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [PropertySearchIndexService, SearchService],
  exports: [PropertySearchIndexService, SearchService],
})
export class SearchModule {}
