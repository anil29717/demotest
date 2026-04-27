import { Module } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { RequirementsController } from './requirements.controller';
import { MatchingModule } from '../matching/matching.module';
import { ContactPolicyModule } from '../contact-policy/contact-policy.module';

@Module({
  imports: [MatchingModule, ContactPolicyModule],
  controllers: [RequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
