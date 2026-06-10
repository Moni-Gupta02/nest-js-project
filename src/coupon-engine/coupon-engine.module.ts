import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CouponEngineController } from './coupon-engine.controller';
import { CouponEngineService } from './coupon-engine.service';

import {
  Coupon,
  CouponSchema,
} from './schemas/coupon-engine.schema';

import {
  Customer,
  CustomerSchema,
} from 'src/customer/schemas/customer.schema';

import {
  Loyalty,
  LoyaltySchema,
} from './schemas/coupon-loyalty.schema';

import {
  SubscriptionFixPrice,
  SubscriptionFixPriceSchema,
} from 'src/subscription/schemas/subscriptionFixPrice';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Coupon.name,
        schema: CouponSchema,
      },
      {
        name: Loyalty.name,
        schema: LoyaltySchema,
      },
      {
        name: Customer.name,
        schema: CustomerSchema,
      },

      {
        // keep model token consistent with SubscriptionModule/SubscriptionService
        name: 'subscription_fix_prices',
        schema: SubscriptionFixPriceSchema,
      },
    ]),
  ],
  controllers: [CouponEngineController],
  providers: [CouponEngineService],
  exports: [CouponEngineService],
})
export class CouponEngineModule { }