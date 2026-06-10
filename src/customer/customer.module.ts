import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from './schemas/customer.schema';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { HistoryService } from 'src/history/history.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Customers', schema: CustomerSchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'History', schema: HistorySchema },
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService, AdminHistoryService, HistoryService],
})
export class CustomerModule {}
