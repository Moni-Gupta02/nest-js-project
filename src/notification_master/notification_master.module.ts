import { Module } from '@nestjs/common';
import { NotificationMasterService } from './notification_master.service';
import { WhatsappNotificationService } from './whatsapp-notification.service';
import { NotificationMasterController } from './notification_master.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationMasterSchema } from './schemas/notification_master.schemas';
import { NotificationHistorySchema } from 'src/notification_history/schemas/notification_history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Notification_Masters', schema: NotificationMasterSchema },
      { name: 'Notification_Histories', schema: NotificationHistorySchema },
    ]),
  ],
  controllers: [NotificationMasterController],
  providers: [NotificationMasterService, WhatsappNotificationService],
  exports: [NotificationMasterService, WhatsappNotificationService],
})
export class NotificationMasterModule { }
