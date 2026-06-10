import { Module } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { supplierSchema } from './schemas/supplier.schemas';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryService } from 'src/history/history.service';
import { HistorySchema } from 'src/history/Schemas/history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Supplier', schema: supplierSchema },
      { name: 'History', schema: HistorySchema },
    ]),
  ],
  controllers: [SupplierController],
  providers: [SupplierService, HistoryService],
})
export class SupplierModule {}
