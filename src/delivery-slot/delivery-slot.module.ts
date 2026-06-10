import { Module } from '@nestjs/common';
import { DeliverySlotService } from './delivery-slot.service';
import { DeliverySlotController } from './delivery-slot.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliverySlotSchema } from './schemas/delivery-slot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'delivery_slots', schema: DeliverySlotSchema },
    ]),
  ],
  controllers: [DeliverySlotController],
  providers: [DeliverySlotService],
})
export class DeliverySlotModule {}
