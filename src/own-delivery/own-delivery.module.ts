import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OwnDeliveryController } from './own-delivery.controller';
import { OwnDeliveryService } from './own-delivery.service';
import { OwnDeliverySchema } from '../pickup-orders/schemas/own-delivery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'OwnDelivery', schema: OwnDeliverySchema },
    ]),
  ],
  controllers: [OwnDeliveryController],
  providers: [OwnDeliveryService],
})
export class OwnDeliveryModule {}