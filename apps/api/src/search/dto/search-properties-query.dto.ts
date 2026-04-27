import { DealType, PropertyType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export type SearchSortMode = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

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

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsNumber()
  lon?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === '' ? undefined : Number(value),
  )
  @IsNumber()
  @Min(1)
  radiusKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['relevance', 'price_asc', 'price_desc', 'newest'])
  sort?: SearchSortMode;
}

export class SearchAutocompleteQueryDto {
  @IsString()
  q!: string;

  @IsIn(['city', 'locality'])
  field!: 'city' | 'locality';
}

export class SearchRunSavedQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsIn(['relevance', 'price_asc', 'price_desc', 'newest'])
  sort?: SearchSortMode;
}
