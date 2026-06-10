import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriverStepperSchema } from '../driver/schemas/driver-stepper.schema';
import { DriverStepperController } from './driver-stepper.controller';
import { DriverStepperService } from './driver-stepper.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'driver_stepper', schema: DriverStepperSchema },
    ]),
  ],
  controllers: [DriverStepperController],
  providers: [DriverStepperService],
})
export class DriverStepperModule {}