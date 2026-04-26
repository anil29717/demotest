import { Controller, Get } from '@nestjs/common';
import { PropertySearchIndexService } from '../search/property-search-index.service';

@Controller()
export class HealthController {
  constructor(
    private readonly propertySearchIndex: PropertySearchIndexService,
  ) {}

  @Get('health')
  async health() {
    let elasticsearch: 'connected' | 'unavailable' = 'unavailable';
    if (this.propertySearchIndex.isEnabled()) {
      elasticsearch = (await this.propertySearchIndex.ping())
        ? 'connected'
        : 'unavailable';
    }
    return { status: 'ok', service: 'ar-buildwel-api', elasticsearch };
  }
}
