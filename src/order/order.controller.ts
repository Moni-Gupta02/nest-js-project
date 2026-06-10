import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ChangeBagBoxDto,
  CustomerPageOrderListBodyDto,
  GetOrdersDto,
} from './dto/get-order.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { ChangeCalorieRangeDto } from './dto/create-order.dto';
import { Public } from 'src/common/decorators';
import { orderHistoryDto } from './dto/order-history.dto';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';

@ApiTags('Orders')
@Controller('order')
@ApiBearerAuth('access-token')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly adminHistoryService: AdminHistoryService,
  ) {}

  @Permissions({ resource: 'orders', actions: 'list' })
  @Get('all-orders')
  async listAllOrders(@Query() query: GetOrdersDto) {
    try {
      const data = await this.orderService.listAllOrders(
        query.orderType,
        query.limit,
        query.page,
        query.search,
        query.startDate,
        query.endDate,
        query.orderStatus,
        query.renewal,
        query.dietType,
        query.sortBy,
        query.sortDirection,
        query.deliveryDays,
        query.planDuration,
        query.financialStatus,
        query.goalType,
      );
      return {
        message: message.GET_DETAILS,
        data: data,
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
  @Permissions({ resource: 'failed_orders', actions: 'list' })
  @Get('failed-order')
  async listFailOrders(@Query() query: GetOrdersDto) {
    try {
      const data = await this.orderService.listFailOrders(
        query.orderType,
        query.limit,
        query.page,
        query.search,
        query.startDate,
        query.endDate,
        query.renewal,
        query.dietType,
        query.sortBy,
        query.sortDirection,
        query.deliveryDays,
        query.planDuration,
        query.financialStatus,
      );
      return {
        message: message.GET_DETAILS,
        data: data,
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
  @Permissions({ resource: 'customers', actions: 'read' })
  @Post('customer-page/customer-page-order-list')
  @ApiOperation({ summary: 'Fetch customer order list for customer page' })
  @ApiResponse({
    status: 200,
    description: 'Customer order list fetched successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async getCustomerPageOrderList(@Body() body: CustomerPageOrderListBodyDto) {
    try {
      const data = await this.orderService.getCustomerPageOrderList(body);
      return {
        message: message.GET_DETAILS,
        data: data,
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

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Get('customer-page/latest-payment-summary')
  async getLatestPaymentSummary(
    @Query('customer_id') customerId: string,
    @Query('order_type') orderType: string,
    @Query('subscription_id') subscriptionId?: string, // Optional parameter
  ) {
    try {
      if (!customerId || !orderType) {
        throw new BadRequestException(
          'customer_id and order_type are required',
        );
      }
      const data = await this.orderService.getLatestPaymentSummary(
        customerId,
        orderType,
        subscriptionId,
      );

      return {
        message: message.GET_DETAILS,
        data: data,
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

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Post('customer-page/change-meal-size')
  @ApiOperation({
    summary: 'Change Calorie Range for an Order and Subscription',
  })
  @ApiResponse({
    status: 200,
    description: 'Calorie range updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async changeCalorieRange(@Body() body: ChangeCalorieRangeDto) {
    try {
      const data = await this.orderService.changeCalorieRange(body);

      return {
        message: message.GET_DETAILS,
        data: data,
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

  @Public()
  @Post('customer-page/order_history')
  @ApiOperation({
    summary: 'Get order history for a customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Order history fetched successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async getOrderHistory(@Body() body: orderHistoryDto) {
    try {
      const data = await this.orderService.getOrderHistory(body);

      return {
        message: message.GET_DETAILS,
        data: data,
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

  @Public()
  @Get('customer-page/add-cooler-bag/:customer_id') // Include ':customer_id' in the route
  @ApiOperation({
    summary: 'Add cooler bag for a customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Cooler bag added successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async addCoolerBag(@Param('customer_id') customer_id: string) {
    // Match parameter name
    try {
      const data = await this.orderService.addCoolerBag(customer_id);

      return {
        message: message.customers.COOLER_BAG,
        data: data,
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

  @Public()
  @Post('customer-page/change-box-bag/:customer_id') // Include ':customer_id' in the route
  @ApiOperation({
    summary: 'Change bag/box for a customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Bag / Box changed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async replaceBagBox(
    @Param('customer_id', new ValidationPipe({ transform: true }))
    customer_id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: ChangeBagBoxDto,
  ) {
    // Match parameter name
    try {
      console.log('bocy', body);
      const data = await this.orderService.replaceBagBox(customer_id, body);

      return {
        message: message.customers.BAG_BOX,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new HttpException(
          {
            message: error.message,
            status: false,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }
}
