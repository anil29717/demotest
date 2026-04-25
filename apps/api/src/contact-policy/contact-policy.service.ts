import { BadRequestException, Injectable } from '@nestjs/common';
import { validatePublishableTextParts } from '@ar-buildwel/shared';

/**
 * Controlled-contact policy for any text shown on listings or requirements (Phase 1 depth).
 * Call sites should use this instead of ad-hoc joins to keep rules consistent.
 */
@Injectable()
export class ContactPolicyService {
  assertRequirementPublicSurfaces(city: string, areas: string[] | undefined): void {
    const parts = [city, ...(areas ?? [])];
    const r = validatePublishableTextParts(parts);
    if (!r.ok) {
      throw new BadRequestException(r.reason);
    }
  }

  assertPropertyListingPublicText(input: {
    title: string;
    description?: string | null;
    areaPublic: string;
    localityPublic: string;
  }): void {
    const combined = `${input.title}\n${input.description ?? ''}\n${input.areaPublic}\n${input.localityPublic}`;
    const r = validatePublishableTextParts([combined]);
    if (!r.ok) {
      throw new BadRequestException(r.reason);
    }
  }
}
