import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDealDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @IsNotEmpty()
  requirementId!: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsString()
  institutionId?: string;

  // Stage is intentionally not user-settable. New deals always start at LEAD.
}
