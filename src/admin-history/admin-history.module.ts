import { Module } from '@nestjs/common';
import { AdminHistoryService } from './admin-history.service';
import { AdminHistoryController } from './admin-history.controller';
import { AdminHistorySchema } from './Schema/adminHistory';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'Customers', schema: CustomerSchema },
    ]),
  ],
  controllers: [AdminHistoryController],
  providers: [AdminHistoryService],
})
export class AdminHistoryModule {}
