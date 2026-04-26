import { UserRole } from '@prisma/client';

export type BillingPlanId =
  | 'BROKER_PRO'
  | 'NRI_SERVICES'
  | 'HNI_ACCESS'
  | 'INSTITUTIONAL';

export type BillingPlanDefinition = {
  id: BillingPlanId;
  name: string;
  /** Annual price in paise */
  annualAmountPaise: number;
  eligibleRoles: UserRole[];
  features: string[];
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: 'BROKER_PRO',
    name: 'Broker Pro',
    annualAmountPaise: 24_999_00,
    eligibleRoles: [UserRole.BROKER, UserRole.ADMIN],
    features: [
      'Unlimited listings',
      'Priority matches',
      'Advanced CRM',
      'Analytics',
      'IRM',
    ],
  },
  {
    id: 'NRI_SERVICES',
    name: 'NRI Services',
    annualAmountPaise: 14_999_00,
    eligibleRoles: [UserRole.NRI, UserRole.ADMIN],
    features: [
      'Dedicated manager',
      'Property monitoring',
      'Rental management',
      'FEMA / TDS support',
    ],
  },
  {
    id: 'HNI_ACCESS',
    name: 'HNI Access',
    annualAmountPaise: 49_999_00,
    eligibleRoles: [UserRole.HNI, UserRole.ADMIN],
    features: [
      'Curated deals',
      'Bank auction alerts',
      'Institutional access',
      'Portfolio intelligence',
    ],
  },
  {
    id: 'INSTITUTIONAL',
    name: 'Institutional',
    annualAmountPaise: 99_999_00,
    eligibleRoles: [
      UserRole.INSTITUTIONAL_BUYER,
      UserRole.INSTITUTIONAL_SELLER,
      UserRole.ADMIN,
    ],
    features: [
      'Confidential listing',
      'NDA management',
      'Data room',
      '9-stage pipeline',
    ],
  },
];

export function getPlanById(planId: string): BillingPlanDefinition | undefined {
  return BILLING_PLANS.find((p) => p.id === planId);
}

export function monthlyAmountPaise(plan: BillingPlanDefinition): number {
  return Math.round(plan.annualAmountPaise / 12);
}
