import { IsIn, IsNotEmpty, IsString } from 'class-validator';

const PLAN_IDS = [
  'BROKER_PRO',
  'NRI_SERVICES',
  'HNI_ACCESS',
  'INSTITUTIONAL',
] as const;

export class BillingCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(PLAN_IDS)
  planId!: (typeof PLAN_IDS)[number];

  @IsIn(['monthly', 'annual'])
  interval!: 'monthly' | 'annual';
}
