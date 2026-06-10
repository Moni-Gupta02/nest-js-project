import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationHistoryService } from './notification_history.service';
import { NotificationHistoryController } from './notification_history.controller';
import { NotificationHistorySchedulerService } from './notification_history.scheduler';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationHistorySchema } from './schemas/notification_history.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Notification_Histories', schema: NotificationHistorySchema },
    ]),
  ],
  controllers: [NotificationHistoryController],
  providers: [NotificationHistoryService, NotificationHistorySchedulerService],
})
export class NotificationHistoryModule {}
