import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BarcodeReportController } from './barcode.controller';
import { BarcodeReportService } from './barcode-report.service';
import { DeliveryRepository } from './barcode-report.repository';
import { BarcodeHelper } from './barcode-report.helper';

import { DeliverySchema } from '../delivery/schemas/delivery.schema';
import { DumpDeliveriesSchema } from '../common/schema/dump_deliveries';
import { DriverStepperSchema } from '../driver/schemas/driver-stepper.schema';
import { masterSchema } from '../common/schema/masterData.schema';
import { CouponSchema } from '../coupon-engine/schemas/coupon-engine.schema';
import { OwnDeliverySchema } from '../pickup-orders/schemas/own-delivery.schema';
import { AWBSchema } from 'src/pickup-orders/schemas/awb.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'delivery', schema: DeliverySchema },
      { name: 'delivery_dump', schema: DumpDeliveriesSchema },
      { name: 'driver_stepper', schema: DriverStepperSchema },
      { name: 'master_data', schema: masterSchema },
      { name: 'coupon', schema: CouponSchema },
      { name: 'own_delivery', schema: OwnDeliverySchema },
      { name: 'awb', schema: AWBSchema },
    ]),
  ],
  controllers: [BarcodeReportController],
  providers: [BarcodeReportService, DeliveryRepository, BarcodeHelper],
  exports: [BarcodeReportService],
})
export class BarcodeReportModule { }