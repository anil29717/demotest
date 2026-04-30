import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { MlClientService } from './ml-client.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SearchModule } from '../search/search.module';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 8000 }),
    NotificationsModule,
    SearchModule,
    forwardRef(() => DealsModule),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, MlClientService],
  exports: [MatchingService],
})
export class MatchingModule {}
