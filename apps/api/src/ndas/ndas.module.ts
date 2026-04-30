import { Module, forwardRef } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NdasController } from './ndas.controller';
import { NdasService } from './ndas.service';

@Module({
  imports: [PrismaModule, NotificationsModule, forwardRef(() => ChatModule)],
  controllers: [NdasController],
  providers: [NdasService],
})
export class NdasModule {}
