import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DealType, PropertyType } from '@prisma/client';

class LocationDto {
  @IsString()
  @MaxLength(255)
  place_name!: string;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsString()
  @MaxLength(120)
  area!: string;

  @IsString()
  @MaxLength(120)
  state!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class CreatePropertyDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsEnum(DealType)
  dealType!: DealType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  areaSqft!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  areaPublic!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  localityPublic!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  addressPrivate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsString()
  organizationId?: string;

  /** Image URLs: https (production/CDN) or http on localhost (dev file uploads). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl(
    { protocols: ['https', 'http'], require_protocol: true, require_tld: false },
    { each: true },
  )
  imageUrls?: string[];

  /** UI label: High-Opportunity Investment Deal (vision Module 9) */
  @IsOptional()
  @IsBoolean()
  isHighOpportunity?: boolean;

  @IsOptional()
  location?: LocationDto;
}
