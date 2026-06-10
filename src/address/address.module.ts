import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { AddressSchema } from './schemas/address.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionSchema } from 'src/subscription/schemas/subscription.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { OrderSchema } from 'src/order/schemas/order.schema';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { HistoryService } from 'src/history/history.service';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { AWBSchema } from 'src/pickup-orders/schemas/awb.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Addresses', schema: AddressSchema },
      { name: 'subscriptions', schema: SubscriptionSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'History', schema: HistorySchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'Orders', schema: OrderSchema },
      { name: 'awbs', schema: AWBSchema },
    ]),
  ],
  controllers: [AddressController],
  providers: [AddressService, AdminHistoryService, HistoryService],
})
export class AddressModule {}
