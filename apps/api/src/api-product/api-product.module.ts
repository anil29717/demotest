import { Module } from '@nestjs/common';
import { PropertiesModule } from '../properties/properties.module';
import { RequirementsModule } from '../requirements/requirements.module';
import { ApiProductController } from './api-product.controller';
import { ApiProductService } from './api-product.service';
import { ApiKeyGuard } from './api-key.guard';
import { V1Controller } from './v1.controller';

@Module({
  imports: [PropertiesModule, RequirementsModule],
  controllers: [ApiProductController, V1Controller],
  providers: [ApiProductService, ApiKeyGuard],
  exports: [ApiProductService],
})
export class ApiProductModule {}

