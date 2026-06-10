import { DeliveryService } from './delivery.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Public } from 'src/common/decorators';
import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  Query,
  HttpException,
  Param,
  Req,
} from '@nestjs/common';
import { Response as NestResponse } from 'express'; // Import Response from NestJS
import { message } from 'src/common/assets';
import { AddSaturdayDeliveryDto } from './dto/add-saturday-delivery.dto';
import {
  AutoSelectionDeliveryDto,
  ChangeDeliveryAddressDto,
  ExtendDeliveryDto,
  FilterCitiesDto,
  FreezeDeliveryDto,
  UnfreezeDeliveryDto,
} from './dto/extend-delivery.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { DishReportDto } from 'src/reports/dto/reports.dto';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import * as moment from 'moment';

@ApiTags('Delivery')
@ApiBearerAuth('access-token')
@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly adminHistoryService: AdminHistoryService,
  ) {}

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Get('customer-page/fetch')
  @ApiQuery({
    name: 'week',
    required: false,
    description: 'Week type (Current week, Past weeks, Following Weeks)',
  })
  @ApiQuery({
    name: 'limit',
    required: true,
    description: 'Limit for pagination',
  })
  @ApiQuery({
    name: 'offset',
    required: true,
    description: 'Offset for pagination',
  })
  @ApiQuery({ name: 'customer_id', required: true, description: 'Customer ID' })
  @ApiQuery({
    name: 'plan',
    required: false,
    description: 'Plan type (Meal Plan Orders, NDD)',
  })
  async fetchDeliveryForCustomer(@Query() query: any) {
    try {
      const response =
        await this.deliveryService.fetchDeliveryForCustomer(query);
      return {
        message: message.GET_DETAILS,
        data: response,
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
  @Permissions({ resource: 'customers', actions: 'read' })
  @Get('customer-page/get-delivery-for-single-subscription') // Customer Page
  @ApiQuery({
    name: 'subscription_id',
    required: true,
    description: 'Subscription ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Offset for pagination',
  })
  async getDeliveryForSingleSubs(
    @Query('subscription_id') subscriptionId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    try {
      const response = await this.deliveryService.getDeliveryForSingleSubs(
        subscriptionId,
        Number(limit) || 10, // Default limit: 10
        Number(page) || 0, // Default offset: 0
      );

      return {
        message: 'Delivery data fetched successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      return {
        message: 'Failed to fetch deliveries',
        error: error.message,
        status: false,
      };
    }
  }

  @Public()
  @Post('dish-cost-report-csv')
  async dishReport(
    @Res() res: NestResponse,
    @Body() dishReportDto: DishReportDto,
  ): Promise<any> {
    const buffer = await this.deliveryService.dishCostReport(dishReportDto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Dish and Cost Order Report.xlsx"',
    );

    res.send(buffer);
  }
  @Public()
  @Post('breakdown-cost-report-csv')
  async costReport(
    @Res() res: NestResponse,
    @Body() dishReportDto: DishReportDto,
  ): Promise<any> {
    const buffer =
      await this.deliveryService.breakdownCostReport(dishReportDto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="BreakdownCost Order Report.xlsx"',
    );

    res.send(buffer);
  }

  @Permissions({ resource: 'customers', actions: 'read' })
  @Post('customer-page/extend') //customer page
  @ApiOperation({ summary: 'Extend Subscription Delivery' })
  async extendDelivery(
    @Req() request: Request,
    @Body() extendDeliveryDto: ExtendDeliveryDto,
  ) {
    try {
      const {
        subscriptionId,
        subscriptionEndDate,
        deliverableDays,
        customerId,
        orderId,
        avoidIngredientsLength,
        order_number,
      } = extendDeliveryDto;
      console.log(
        'ashdkjsahds',
        subscriptionId,
        subscriptionEndDate,
        deliverableDays,
        customerId,
        orderId,
        avoidIngredientsLength,
        order_number,
      );
      const user = request['user'];
      const response = await this.deliveryService.addExtendDelivery(
        subscriptionId,
        subscriptionEndDate,
        deliverableDays,
        customerId,
        orderId,
        avoidIngredientsLength,
      );
      await this.adminHistoryService.createAdminHistory(
        'ORDER_ADD_EXTEND_DELIVERY',
        user,
        customerId,
        {},
        {
          added_date: moment(new Date(response?.dateHistory)).format(
            'MM/DD/YYYY',
          ),
        },
        {
          customer_id: customerId?.toString(),
          order_id: orderId?.toString(),
          order_number: order_number?.toString(),
        },
      );
      return {
        message: message.GET_DETAILS,
        data: response,
        // data: [],
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
  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Get('customer-page/get-delivery-dates-for-partial-cancellation')
  @ApiOperation({ summary: 'Get delivery dates for partial cancellation' })
  async getDeliveryDatesForPartialCancellation(
    @Query('subscription_id') subscriptionId: string,
  ) {
    try {
      const response =
        await this.deliveryService.getDeliveryDatesForPartialCancellation(
          subscriptionId,
        );
      return {
        message: message.GET_DETAILS,
        data: response,
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
  @Permissions({ resource: 'Customer_page_orders', actions: 'update' }) //customer page
  @Post('customer-page/freeze')
  async freezeDelivery(
    @Req() request: Request,
    @Body() payload: FreezeDeliveryDto,
  ) {
    try {
      const user = request['user'];
      console.log('user data', user);
      const response = await this.deliveryService.freezeDelivery(payload);
      console.log('payload.customer', payload);
      if (response?.historyDates?.length > 0) {
        await this.adminHistoryService.createAdminHistory(
          'ORDER_SKIP_DELIVERY',
          user,
          payload?.customer_id,
          {},
          { freeze_date: response?.historyDates?.join(', ') },
          {
            customer_id: payload?.customer_id,
          },
        );
      }
      return {
        message: 'Delivery Skipped Successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'Customer_page_orders', actions: 'update' }) //customer page
  @Post('customer-page/unfreeze')
  async unfreezeDelivery(
    @Req() request: Request,
    @Body() payload: UnfreezeDeliveryDto,
  ) {
    try {
      const user = request['user'];

      const response = await this.deliveryService.unfreezeDelivery(payload);
      console.log('payload.customer', payload);
      console.log(response?.historyDates);
      if (response?.historyDates?.length > 0) {
        await this.adminHistoryService.createAdminHistory(
          'ORDER_UNSKIP_DELIVERY',
          user,
          payload?.customer_id,
          {},
          { restart_dates: response?.historyDates?.join(', ') },
          {
            customer_id: payload?.customer_id,
          },
        );
      }
      return {
        message: 'Delivery unskipped Successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  // @Public()
  // @Post('ingredient-report-csv')
  // async ingredientWeeklyReport(
  //   @Res() res: NestResponse,
  //   @Body() ingredientWeeklyReportDto: IngredientWeeklyReportDto,
  // ): Promise<any> {
  //   const buffer = await this.deliveryService.ingredientWeeklyReport(
  //     ingredientWeeklyReportDto,
  //   );

  //   res.setHeader(
  //     'Content-Type',
  //     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //   );
  //   res.setHeader(
  //     'Content-Disposition',
  //     'attachment; filename="AutoSelection_Report.xlsx"',
  //   );

  //   res.send(buffer);
  // }
  @Public()
  @Get('cities-with-areas')
  @ApiOperation({
    summary:
      'Get all city names and their respective areas (with optional filters)',
  })
  async getCitiesWithAreas(@Query() filter: FilterCitiesDto) {
    try {
      const data = await this.deliveryService.getCitiesWithAreas(filter);
      return {
        message: 'Cities and areas fetched successfully',
        data,
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

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Get('customer-page/all-deliveries-date/:id')
  async getAllDeliveriesDates(@Param('id') id: string) {
    try {
      const response = await this.deliveryService.getAllDeliveriesDates(id);
      return {
        message: 'Deliveries received successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'Customer_page_orders', actions: 'update' }) //customer page
  @Post('customer-page/change-address-slot')
  @ApiOperation({ summary: 'Change delivery address and slot based on type' })
  @ApiBody({ type: ChangeDeliveryAddressDto })
  async changeDeliveryAddressSlot(
    @Req() request: Request,
    @Body() dto: ChangeDeliveryAddressDto,
  ) {
    try {
      const user = request['user'];
      const result = await this.deliveryService.updateDeliveryAddress(dto);
      await this.adminHistoryService.createAdminHistory(
        'CHANGE_DELIVERY_ADDRESS',
        user,
        dto?.customer_id,
        result?.histories?.before,
        result?.histories?.after,
        {
          customer_id: dto.customer_id,
          subscription_id: dto.subscription_id,
          delivery_id: dto.delivery_id,
        },
      );
      return {
        message: 'Address changed successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Post('customer-page/auto-selection')
  @ApiOperation({ summary: 'Trigger auto-selection for customer delivery dates' })
  @ApiBody({ type: AutoSelectionDeliveryDto })
  async autoSelectionForRestartDates(
    @Body() payload: AutoSelectionDeliveryDto,
  ) {
    try {
      const response =
        await this.deliveryService.autoSelectionForRestartDates(payload);
      return {
        message: 'Auto-selection completed successfully',
        data: response,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Post('customer-page/add-saturday')
  @ApiOperation({ summary: 'Add Saturday delivery for a subscription' })
  @ApiBody({ type: AddSaturdayDeliveryDto })
  async addSaturdayDelivery(@Body() dto: AddSaturdayDeliveryDto) {
    try {
      const created = await this.deliveryService.addSaturdayDelivery(dto);
      return {
        message: 'Saturday delivery added successfully',
        data: created,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
