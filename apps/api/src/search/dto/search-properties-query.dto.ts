import { DealType, PropertyType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function toBool(v: unknown): boolean | undefined {
  if (v === true || v === 'true' || v === '1' || v === 1) return true;
  if (v === false || v === 'false' || v === '0' || v === 0) return false;
  return undefined;
}

export class SearchPropertiesQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(DealType)
  dealType?: DealType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAreaSqft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAreaSqft?: number;

  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  isBankAuction?: boolean;

  @IsOptional()
  @IsString()
  distressedLabel?: string;
}
