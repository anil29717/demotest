import { BadRequestException } from '@nestjs/common';
import { ContactPolicyService } from './contact-policy.service';

describe('ContactPolicyService', () => {
  const svc = new ContactPolicyService();

  it('allows clean requirement city', () => {
    expect(() =>
      svc.assertRequirementPublicSurfaces('Mumbai', ['Bandra']),
    ).not.toThrow();
  });

  it('rejects phone-like pattern in requirement city', () => {
    expect(() =>
      svc.assertRequirementPublicSurfaces('Call 9876543210', []),
    ).toThrow(BadRequestException);
  });

  it('rejects email in property locality', () => {
    expect(() =>
      svc.assertPropertyListingPublicText({
        title: 'Flat',
        description: null,
        areaPublic: 'Area',
        localityPublic: 'reach me at a@b.co',
      }),
    ).toThrow(BadRequestException);
  });
});
