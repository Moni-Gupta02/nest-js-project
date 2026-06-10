import { Module } from '@nestjs/common';
import { PickupOrdersService } from './pickup-orders.service';
import { PickupOrdersController } from './pickup-orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AWBSchema } from './schemas/awb.schema';
import { TaskManagementSchema } from './schemas/task-management.schema';
import { SequenceSchema } from './schemas/sequence.schema';
import { OwnDeliverySchema } from './schemas/own-delivery.schema';
import { OrderSchema } from 'src/order/schemas/order.schema';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'awbs', schema: AWBSchema },
      { name: 'task_managements', schema: TaskManagementSchema },
      { name: 'sequences', schema: SequenceSchema },
      { name: 'own_deliveries', schema: OwnDeliverySchema },
      { name: 'Orders', schema: OrderSchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'Customers', schema: CustomerSchema },
    ]),
  ],
  controllers: [PickupOrdersController],
  providers: [PickupOrdersService, AdminHistoryService],
})
export class PickupOrdersModule {}
