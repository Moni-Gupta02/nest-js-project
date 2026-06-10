import { Module } from '@nestjs/common';
import { ManualOperationService } from './manual-operation.service';
import { ManualOperationController } from './manual-operation.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { CartSchema } from 'src/cart/Schemas/cart.schema';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { LeadStageHistorySchema } from 'src/deliver-finance-reports/schemas/lead-stage-history.schema';
import { DeliverFinanceReportsModule } from 'src/deliver-finance-reports/deliver-finance-reports.module';
import { CouponSchema } from 'src/coupon/schemas/coupon.schema';
import { AddressSchema } from 'src/address/schemas/address.schema';
import { NotificationMasterModule } from 'src/notification_master/notification_master.module';

@Module({
  imports: [
    HttpModule,
    DeliverFinanceReportsModule,
    NotificationMasterModule,
    MongooseModule.forFeature([
      { name: 'Cart', schema: CartSchema }, // Replace with your actual Cart schema
      { name: 'Customer', schema: CustomerSchema }, // Replace with your actual Customer schema
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'LeadStageHistory', schema: LeadStageHistorySchema },
      { name: 'coupons', schema: CouponSchema },
      { name: 'Addresses', schema: AddressSchema },
    ]),
  ],

  controllers: [ManualOperationController],
  providers: [ManualOperationService, AdminHistoryService],
})
export class ManualOperationModule {}
