import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { DealType, PropertyType } from '@prisma/client';
import { ApiKeyGuard } from './api-key.guard';
import { ApiProductService } from './api-product.service';
import { PropertiesService } from '../properties/properties.service';
import { RequirementsService } from '../requirements/requirements.service';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Urgency } from '@prisma/client';

type ApiConsumerRequest = {
  method: string;
  route?: { path?: string };
  apiConsumer?: { apiKeyId: string; userId: string };
};

class V1CreateRequirementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax!: number;

  @IsString()
  @MaxLength(120)
  city!: string;

  @IsArray()
  @IsString({ each: true })
  areas!: string[];

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsEnum(DealType)
  dealType!: DealType;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  areaSqftMin!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  areaSqftMax!: number;

  @IsEnum(Urgency)
  urgency!: Urgency;
}

class V1CreatePropertyDto {
  @IsString()
  @MaxLength(200)
  title!: string;

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
  @Min(0)
  price!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  areaSqft!: number;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsEnum(DealType)
  dealType!: DealType;

  @IsArray()
  @IsString({ each: true })
  imageUrls!: string[];
}

@Controller('v1')
@UseGuards(ApiKeyGuard)
export class V1Controller {
  constructor(
    private readonly apiProduct: ApiProductService,
    private readonly properties: PropertiesService,
    private readonly requirements: RequirementsService,
  ) {}

  private async track(req: ApiConsumerRequest, status: number, startMs: number) {
    if (!req.apiConsumer) return;
    await this.apiProduct.recordUsage({
      apiKeyId: req.apiConsumer.apiKeyId,
      endpoint: req.route?.path ?? 'v1',
      method: req.method ?? 'GET',
      responseStatus: status,
      responseTimeMs: Date.now() - startMs,
    });
  }

  @Get('properties')
  async listProperties(@Req() req: ApiConsumerRequest) {
    const start = Date.now();
    const data = await this.properties.listPublic();
    await this.track(req, 200, start);
    return data;
  }

  @Post('properties')
  async createProperty(@Req() req: ApiConsumerRequest, @Body() dto: V1CreatePropertyDto) {
    const start = Date.now();
    const userId = req.apiConsumer?.userId;
    const data = await this.properties.create(userId ?? '', dto);
    await this.track(req, 201, start);
    return data;
  }

  @Get('requirements')
  async listRequirements(@Req() req: ApiConsumerRequest) {
    const start = Date.now();
    const data = await this.requirements.listPublic();
    await this.track(req, 200, start);
    return data;
  }

  @Post('requirements')
  async createRequirement(@Req() req: ApiConsumerRequest, @Body() dto: V1CreateRequirementDto) {
    const start = Date.now();
    const userId = req.apiConsumer?.userId;
    const data = await this.requirements.create(userId ?? '', dto);
    await this.track(req, 201, start);
    return data;
  }
}
