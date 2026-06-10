import { PartialType } from '@nestjs/swagger';
import { CreateDeliverySlotDto } from './create.dto';

export class UpdateDriverDto extends PartialType(CreateDeliverySlotDto) {}
