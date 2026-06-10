import { Controller, Post, Body, HttpException, Req } from '@nestjs/common';
import { PickupOrdersService } from './pickup-orders.service';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { CreatePickUpOrderDto } from './dto/pickup-order.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';

@ApiTags('pickup-orders')
@ApiBearerAuth('access-token')
@Controller('pickup-orders')
export class PickupOrdersController {
  constructor(
    private readonly pickupOrdersService: PickupOrdersService,
    private readonly adminHistoryService: AdminHistoryService,
  ) {}

  @Post('create')
  @Permissions({ resource: 'Customer_page_details', actions: 'update' })
  async createPickUpOrder(
    @Req() request: Request,
    @Body() payload: CreatePickUpOrderDto,
  ) {
    try {
      const user = request['user'];
      const response =
        await this.pickupOrdersService.createPickUpOrder(payload);
      await this.adminHistoryService.createAdminHistory(
        'CREATE_PICKUP_ORDER',
        user,
        payload.customer_id,
        {},
        payload,
      );
      return {
        message: 'Pick-up order created successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
