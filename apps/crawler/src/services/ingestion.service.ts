import axios from 'axios';
import type { RawListing } from '../base.crawler.js';
import { DedupService } from './dedup.service.js';
import { QualityScorerService } from './quality-scorer.service.js';

export class IngestionService {
  constructor(
    private readonly dedup = new DedupService(),
    private readonly scorer = new QualityScorerService(),
  ) {}

  async ingestListing(listing: RawListing): Promise<boolean> {
    const hash = this.dedup.generateHash(listing);
    const exists = await this.dedup.isAlreadyIndexed(hash).catch(() => false);
    if (exists) return false;
    const score = this.scorer.score(listing);
    const threshold = Number(process.env.QUALITY_THRESHOLD ?? '50');
    if (score < threshold) return false;

    const base = process.env.API_BASE_URL ?? 'http://localhost:4000';
    const token = process.env.API_CRAWLER_TOKEN ?? '';
    try {
      await axios.post(
        `${base}/properties`,
        {
          title: listing.title,
          description: listing.description,
          city: listing.city,
          localityPublic: listing.locality ?? listing.city,
          areaPublic: listing.locality ?? listing.city,
          addressPrivate: listing.locality ?? listing.city,
          price: listing.price ?? 0,
          areaSqft: listing.areaSqft ?? 0,
          latitude: 0,
          longitude: 0,
          propertyType: listing.propertyType,
          dealType: listing.dealType,
          imageUrls: listing.imageUrls,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeout: 20000,
        },
      );
      return true;
    } catch {
      return false;
    }
  }
}

