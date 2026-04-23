import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DealStage } from '@prisma/client';

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

  @IsOptional()
  stage?: DealStage;
}
