import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { MlClientService } from './ml-client.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadsModule } from '../leads/leads.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 8000 }),
    NotificationsModule,
    LeadsModule,
    SearchModule,
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MlClientService],
  exports: [MatchingService],
})
export class MatchingModule {}
