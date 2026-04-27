import type { RawListing } from '../base.crawler.js';

export class QualityScorerService {
  score(listing: RawListing): number {
    let s = 0;
    if ((listing.title ?? '').length > 20) s += 30;
    if ((listing.description ?? '').length > 100) s += 20;
    if ((listing.imageUrls ?? []).length >= 2) s += 20;
    if ((listing.price ?? 0) > 100000 && (listing.price ?? 0) < 500000000) s += 15;
    if ((listing.locality ?? '').trim().length > 3) s += 15;
    return Math.max(0, Math.min(100, s));
  }
}

