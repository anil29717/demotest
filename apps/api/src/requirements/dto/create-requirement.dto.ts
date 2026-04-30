import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DealType, PropertyType, Urgency } from '@prisma/client';

class LocationDto {
  @IsString()
  @IsNotEmpty()
  place_name!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  area!: string;

  @IsString()
  @IsNotEmpty()
  state!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  lng!: number;
}

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

  @IsOptional()
  location?: LocationDto;
}
