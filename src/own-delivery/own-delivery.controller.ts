import { Controller, Get } from '@nestjs/common';
import { OwnDeliveryService } from './own-delivery.service';
import { Public } from '../common/decorators';

@Public()
@Controller('own-delivery')
export class OwnDeliveryController {
  constructor(private readonly service: OwnDeliveryService) {}

  @Get()
  getOwnDeliveryList() {
    return this.service.getOwnDeliveryList();
  }
}