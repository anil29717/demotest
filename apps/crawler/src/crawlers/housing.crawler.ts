import { BaseCrawler, type RawListing } from '../base.crawler.js';

export class HousingCrawler extends BaseCrawler {
  sourceName = 'HOUSING';

  async crawlCity(_city: string): Promise<RawListing[]> {
    // TODO: implement selectors and extraction for housing.com.
    return [];
  }
}

