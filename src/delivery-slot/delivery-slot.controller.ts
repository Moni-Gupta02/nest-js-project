import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DeliverySlotService } from './delivery-slot.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';

@ApiTags('delivery-slot')
@ApiBearerAuth('access-token')
@Controller('delivery-slot')
export class DeliverySlotController {
  constructor(private readonly deliverySlotService: DeliverySlotService) {}
  @Permissions({ resource: 'customers', actions: 'read' })
  @Get('list-by-city')
  async getDeliverySlots(
    @Query('filters.city_name') cityName: string,
    @Query('filters.province') province: string,
  ) {
    try {
      if (!cityName || !province) {
        throw new BadRequestException('City name and province are required');
      }

      const response = await this.deliverySlotService.getDeliverySlots(
        cityName,
        province,
      );
      return {
        data: response,
        message: 'Delivery slots retrieved successfully',
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
