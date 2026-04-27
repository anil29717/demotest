export type RawListing = {
  title: string;
  description?: string;
  city: string;
  locality?: string;
  price?: number;
  areaSqft?: number;
  bedrooms?: number;
  propertyType: 'RESIDENTIAL' | 'COMMERCIAL' | 'PLOT';
  dealType: 'SALE' | 'RENT';
  imageUrls: string[];
  sourceUrl: string;
  sourceId: string;
  sourceName: string;
};

export abstract class BaseCrawler {
  abstract sourceName: string;
  abstract crawlCity(city: string): Promise<RawListing[]>;

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async randomDelay(): Promise<void> {
    const wait = 2000 + Math.floor(Math.random() * 2000);
    await this.delay(wait);
  }

  protected cleanText(text: string): string {
    return String(text ?? '')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  protected extractPrice(text: string): number | null {
    const t = this.cleanText(text).toLowerCase().replace(/,/g, '');
    if (!t) return null;
    const num = Number((t.match(/(\d+(\.\d+)?)/)?.[1] ?? '').trim());
    if (!Number.isFinite(num)) return null;
    if (t.includes(' cr')) return Math.round(num * 10000000);
    if (t.includes(' l')) return Math.round(num * 100000);
    return Math.round(num);
  }

  protected extractArea(text: string): number | null {
    const t = this.cleanText(text).toLowerCase().replace(/,/g, '');
    const n = Number((t.match(/(\d+(\.\d+)?)/)?.[1] ?? '').trim());
    if (!Number.isFinite(n)) return null;
    if (t.includes('sq.m') || t.includes('sqm')) return Math.round(n * 10.7639);
    return Math.round(n);
  }
}

