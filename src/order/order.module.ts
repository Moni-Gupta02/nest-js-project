import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema } from './schemas/order.schema';
import { CouponSchema } from 'src/coupon-engine/schemas/coupon-engine.schema';
import { SubscriptionSchema } from 'src/subscription/schemas/subscription.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { OrderHistorySchema } from './schemas/order_history.schema';
import { AWBSchema } from 'src/pickup-orders/schemas/awb.schema';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Orders', schema: OrderSchema },
      { name: 'OrdersHistory', schema: OrderHistorySchema },
      { name: 'Coupons', schema: CouponSchema },
      { name: 'Subscriptions', schema: SubscriptionSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'awbs', schema: AWBSchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'Customers', schema: CustomerSchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService, AdminHistoryService],
})
export class OrderModule {}
