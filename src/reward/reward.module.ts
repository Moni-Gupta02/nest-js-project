import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RewardSchema } from './Schema /reward.schema';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { masterSchema } from 'src/common/schema/masterData.schema';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'rewards', schema: RewardSchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'masterData', schema: masterSchema },
      { name: 'admin_history', schema: AdminHistorySchema },
    ]),
  ],
  controllers: [RewardController],
  providers: [RewardService, AdminHistoryService],
})
export class RewardModule {}
