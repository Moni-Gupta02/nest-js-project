import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OrderSchema } from '../order/schemas/order.schema';
import { DeliverySchema } from '../delivery/schemas/delivery.schema';
import { CartSchema } from '../cart/Schemas/cart.schema';
import { CustomerSchema } from '../customer/schemas/customer.schema';
import { RewardSchema } from '../reward/Schema /reward.schema';
import { SubscriptionPriceSchema } from '../subscription/schemas/subscriptionPrice.schema';
import { SubscriptionFixPriceSchema } from '../subscription/schemas/subscriptionFixPrice';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Order', schema: OrderSchema },
      { name: 'Delivery', schema: DeliverySchema },
      { name: 'Cart', schema: CartSchema },
      { name: 'Customer', schema: CustomerSchema },
      // Order schema uses ref: 'Rewards', so register that exact model name.
      // Also map it to the existing `rewards` collection.
      { name: 'Rewards', schema: RewardSchema, collection: 'rewards' },
      { name: 'subscription_prices', schema: SubscriptionPriceSchema },
      { name: 'subscription_fix_prices', schema: SubscriptionFixPriceSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
