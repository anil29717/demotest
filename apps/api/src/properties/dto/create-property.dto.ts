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
  MaxLength,
  Min,
} from 'class-validator';
import { DealType, PropertyType } from '@prisma/client';

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
  city!: string;

  @IsString()
  @IsNotEmpty()
  areaPublic!: string;

  @IsString()
  @IsNotEmpty()
  localityPublic!: string;

  @IsString()
  @IsNotEmpty()
  addressPrivate!: string;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  organizationId?: string;

  /** HTTPS image URLs (CDN); no contact info in filenames */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  imageUrls?: string[];

  /** UI label: High-Opportunity Investment Deal (vision Module 9) */
  @IsOptional()
  @IsBoolean()
  isHighOpportunity?: boolean;
}
