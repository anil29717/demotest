import { Module } from '@nestjs/common';
import { FraudModule } from '../fraud/fraud.module';
import { SearchModule } from '../search/search.module';
import { ContactPolicyModule } from '../contact-policy/contact-policy.module';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { MatchingModule } from '../matching/matching.module';

@Module({
  imports: [MatchingModule, FraudModule, SearchModule, ContactPolicyModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
