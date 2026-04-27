import { BaseCrawler, type RawListing } from '../base.crawler.js';

export class Acres99Crawler extends BaseCrawler {
  sourceName = '99ACRES';

  async crawlCity(_city: string): Promise<RawListing[]> {
    // TODO: implement selectors and extraction for 99acres.
    return [];
  }
}

