import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { DealType, PropertyType, Urgency } from '@prisma/client';

export class CreateRequirementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax!: number;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  areas!: string[];

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsEnum(DealType)
  dealType!: DealType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaSqftMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaSqftMax!: number;

  @IsEnum(Urgency)
  urgency!: Urgency;
}
