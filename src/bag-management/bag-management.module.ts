import { Module } from '@nestjs/common';
import { BagManagementService } from './bag-management.service';
import { BagManagementController } from './bag-management.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BagManagementSchema } from './Schema/bag-management.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'bag_managements', schema: BagManagementSchema },
    ]),
  ],
  controllers: [BagManagementController],
  providers: [BagManagementService],
})
export class BagManagementModule {}
