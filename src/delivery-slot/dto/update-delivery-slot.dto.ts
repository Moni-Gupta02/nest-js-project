import { PartialType } from '@nestjs/swagger';
import { CreateDeliverySlotDto } from './create-delivery-slot.dto';

export class UpdateDeliverySlotDto extends PartialType(CreateDeliverySlotDto) {}
