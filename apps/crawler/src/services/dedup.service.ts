import crypto from 'crypto';
import axios from 'axios';
import type { RawListing } from '../base.crawler.js';

export class DedupService {
  generateHash(listing: RawListing): string {
    const norm = [
      listing.title.trim().toLowerCase(),
      listing.city.trim().toLowerCase(),
      String(listing.price ?? ''),
      String(listing.areaSqft ?? ''),
    ].join('|');
    return crypto.createHash('sha256').update(norm).digest('hex');
  }

  async isAlreadyIndexed(hash: string): Promise<boolean> {
    const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const token = process.env.API_CRAWLER_TOKEN ?? '';
    const res = await axios.get<{ exists?: boolean }>(
      `${base}/properties/check-hash?hash=${encodeURIComponent(hash)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        timeout: 10000,
      },
    );
    return Boolean(res.data?.exists);
  }
}

