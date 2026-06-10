import { Module } from '@nestjs/common';
import { DeliverFinanceReportsService } from './deliver-finance-reports.service';
import { DeliverFinanceReportsController } from './deliver-finance-reports.controller';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { ScheduleModule } from '@nestjs/schedule'; // Import ScheduleModule
import { Delivery, DeliverySchema } from '../delivery/schemas/delivery.schema'; // Import the Delivery schema
import { Master, masterSchema } from '../common/schema/masterData.schema';
import { Order, OrderSchema } from '../order/schemas/order.schema';
import { Customer, CustomerSchema } from '../customer/schemas/customer.schema';
import { Cart, CartSchema } from '../cart/Schemas/cart.schema';
import { HttpModule } from '@nestjs/axios';
import { NotificationMasterModule } from '../notification_master/notification_master.module'; // 👈 here
import {
  LeadStageHistory,
  LeadStageHistorySchema,
} from './schemas/lead-stage-history.schema';
@Module({
  imports: [
    HttpModule, // ✅ required for HttpService
    MongooseModule.forFeature([
      { name: Delivery.name, schema: DeliverySchema },
    ]), // Register the Delivery model here
    MongooseModule.forFeature([{ name: Master.name, schema: masterSchema }]),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
    ]),
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    MongooseModule.forFeature([
      { name: LeadStageHistory.name, schema: LeadStageHistorySchema },
    ]),
    ScheduleModule.forRoot(), // Register ScheduleModule here
    NotificationMasterModule, // 👈 import here
  ],
  providers: [DeliverFinanceReportsService],
  controllers: [DeliverFinanceReportsController],
  exports: [DeliverFinanceReportsService],
})
export class DeliverFinanceReportsModule { }
