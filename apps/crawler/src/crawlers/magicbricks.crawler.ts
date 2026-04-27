import { chromium } from 'playwright';
import { BaseCrawler, type RawListing } from '../base.crawler.js';

export class MagicBricksCrawler extends BaseCrawler {
  sourceName = 'MAGICBRICKS';

  async crawlCity(city: string): Promise<RawListing[]> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const out: RawListing[] = [];
    try {
      const url = `https://www.magicbricks.com/property-for-sale/residential-real-estate?cityName=${encodeURIComponent(city)}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1800);
      const cards = await page.locator('a[href*="/propertyDetails"]').all();
      const limit = Math.min(cards.length, Number(process.env.MAX_LISTINGS_PER_CITY ?? '50'));
      for (let i = 0; i < limit; i += 1) {
        const c = cards[i];
        if (!c) continue;
        const href = (await c.getAttribute('href')) || '';
        const title = this.cleanText((await c.innerText()) || '');
        if (!href || !title) continue;
        out.push({
          title,
          city,
          propertyType: 'RESIDENTIAL',
          dealType: 'SALE',
          imageUrls: [],
          sourceUrl: href.startsWith('http') ? href : `https://www.magicbricks.com${href}`,
          sourceId: href.split('/').pop() || `${city}-${i}`,
          sourceName: this.sourceName,
        });
      }
    } catch {
      // continue with partial data
    } finally {
      await page.close();
      await browser.close();
    }
    return out;
  }
}

