import { Module } from '@nestjs/common';
import { DriverService } from './driver.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliverySlotSchema } from './schemas/driver.schema';
import { DriverController } from './driver.controller';
import { VehicleSchema } from './schemas/vehicle.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { DumpDeliveriesSchema } from 'src/common/schema/dump_deliveries';
import { OrderSchema } from 'src/order/schemas/order.schema';
import { SubscriptionSchema } from 'src/subscription/schemas/subscription.schema';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { AddressSchema } from 'src/address/schemas/address.schema';
import { MasterDataSchema } from 'src/masterdata/Schemas/masterdata.schema';
import { DriverStepperSchema } from './schemas/driver-stepper.schema';
import { CouponSchema } from 'src/coupon-engine/schemas/coupon-engine.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'delivery_slot', schema: DeliverySlotSchema },
      { name: 'vehicles', schema: VehicleSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'delivery_dumps', schema: DumpDeliveriesSchema },
      { name: 'Orders', schema: OrderSchema },
      { name: 'Subscriptions', schema: SubscriptionSchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'Addresses', schema: AddressSchema },
      { name: 'MasterDataKMS', schema: MasterDataSchema },
      { name: 'coupons', schema: CouponSchema },
      { name: 'DriverStepper', schema: DriverStepperSchema },
    ]),
  ],

  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
