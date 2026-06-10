import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionSchema } from './schemas/subscription.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPriceSchema } from './schemas/subscriptionPrice.schema';
import { SubscriptionFixPriceSchema } from './schemas/subscriptionFixPrice';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { OrderSchema } from 'src/order/schemas/order.schema';
import { RewardSchema } from 'src/reward/Schema /reward.schema';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { NotificationMasterSchema } from 'src/notification_master/schemas/notification_master.schemas';
import { NotificationHistorySchema } from 'src/notification_history/schemas/notification_history.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { AWBSchema } from 'src/pickup-orders/schemas/awb.schema';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { OrderHistorySchema } from 'src/order/schemas/order_history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'subscriptions', schema: SubscriptionSchema },
      { name: 'subscription_prices', schema: SubscriptionPriceSchema },
      { name: 'subscription_fix_prices', schema: SubscriptionFixPriceSchema },
      { name: 'Delivery', schema: DeliverySchema },
      { name: 'Orders', schema: OrderSchema },
      { name: 'rewards', schema: RewardSchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'dump_recipes', schema: DumpRecipesSchema },
      { name: 'Notification_Masters', schema: NotificationMasterSchema },
      { name: 'Notification_Histories', schema: NotificationHistorySchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'awbs', schema: AWBSchema },
      { name: 'OrdersHistory', schema: OrderHistorySchema },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    NotificationMasterService,
    AdminHistoryService,
  ],
})
export class SubscriptionModule {}
