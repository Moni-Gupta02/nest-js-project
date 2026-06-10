import { Module } from '@nestjs/common';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { DeliverySchema } from './schemas/delivery.schema';
import { OrderSchema } from 'src/order/schemas/order.schema';
import { CouponSchema } from 'src/coupon-engine/schemas/coupon-engine.schema';
import { SubscriptionSchema } from 'src/subscription/schemas/subscription.schema';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { DumpDeliveriesSchema } from 'src/common/schema/dump_deliveries';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { NotificationMasterSchema } from 'src/notification_master/schemas/notification_master.schemas';
import { NotificationHistorySchema } from 'src/notification_history/schemas/notification_history.schema';
import { RecipeRatingSchema } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { DeliverySlotSchema } from 'src/delivery-slot/schemas/delivery-slot.schema';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { AWBSchema } from 'src/pickup-orders/schemas/awb.schema';
import { AddressSchema } from 'src/address/schemas/address.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'Orders', schema: OrderSchema },
      { name: 'coupons', schema: CouponSchema },
      { name: 'Subscriptions', schema: SubscriptionSchema },
      { name: 'dump_recipes', schema: DumpRecipesSchema },
      { name: 'delivery_dumps', schema: DumpDeliveriesSchema },
      { name: 'Notification_Masters', schema: NotificationMasterSchema },
      { name: 'Notification_Histories', schema: NotificationHistorySchema },
      { name: 'Rating', schema: RecipeRatingSchema },
      { name: 'delivery_slots', schema: DeliverySlotSchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'awbs', schema: AWBSchema },
      { name: 'Addresses', schema: AddressSchema },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, NotificationMasterService, AdminHistoryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
