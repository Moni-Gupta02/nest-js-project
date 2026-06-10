import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  BadRequestException,
  Post,
} from '@nestjs/common';
import { NotificationHistoryService } from './notification_history.service';
import { ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Notification History')
@Controller('notification-history')
export class NotificationHistoryController {
  constructor(
    private readonly notificationHistoryService: NotificationHistoryService,
  ) {}
  @Get()
  @Public()
  @ApiResponse({
    status: 200,
    description: 'List of notification history records.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Limit per page',
  })
  @ApiQuery({ name: 'notification_type', required: false, example: 'SMS' })
  @ApiQuery({
    name: 'customer_id',
    required: false,
    example: '615d09ab52858b0d249f676e',
  })
  @ApiQuery({
    name: 'notification_title',
    required: false,
    example: 'Order Placed',
  })
  async getAll(
    @Query() query: any, // Use query to capture all parameters
  ) {
    try {
      const { page = 0, limit = 10, ...filterDto } = query;
      const data = await this.notificationHistoryService.getAll(
        filterDto,
        page,
        limit,
      );
      return {
        message: message.GET_DETAILS,
        data,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Get(':id')
  @Public()
  @ApiResponse({ status: 200, description: 'Notification history details.' })
  @ApiParam({ name: 'id', example: '615d09ab52858b0d249f676e' })
  async getById(@Param('id') id: string) {
    try {
      const data = await this.notificationHistoryService.getById(id);
      return {
        message: message.GET_DETAILS,
        data,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'Notification history deleted successfully.',
  })
  @ApiParam({ name: 'id', example: '615d09ab52858b0d249f676e' })
  async delete(@Param('id') id: string) {
    try {
      const data = await this.notificationHistoryService.delete(id);
      return {
        message: message.DELETE_SUCCESS,
        data,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'customers', actions: 'read' })
  @Post('customer-page/latest') //customer page
  async getNotificationHistory(@Query('customerId') customerId: string) {
    console.log(customerId, '---customer Id');
    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }

    const response =
      await this.notificationHistoryService.getNotificationHistory(customerId);

    return {
      message: message.GET_DETAILS,
      data: response,
      status: true,
    };
  }
}
