import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TranscorpReportController } from './transcorp-report.controller';
import { TranscorpReportService } from './transcorp-report.service';

import { AWBSchema } from '../pickup-orders/schemas/awb.schema';
import { OrderSchema } from '../order/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'AWB',
        schema: AWBSchema,
      },
      {
        name: 'Orders',
        schema: OrderSchema,
      },
    ]),
  ],

  controllers: [TranscorpReportController],

  providers: [TranscorpReportService],

  exports: [TranscorpReportService],
})
export class TranscorpReportModule {}