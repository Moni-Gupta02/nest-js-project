import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { CouponEngineService } from './coupon-engine.service';
import { CreateCouponDto } from './dto/create-coupon-engine.dto';
import { UpdateCouponDto } from './dto/update-coupon-engine.dto';
import { SwaggerExamples } from './dto/swagger-examples.dto';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { message } from 'src/common/assets';

@ApiTags('Coupon Engine')
@ApiBearerAuth('access-token')
@Controller('coupons')
export class CouponEngineController {
  constructor(private readonly couponService: CouponEngineService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    type: CreateCouponDto,
    examples: {
      singleCoupon: SwaggerExamples.CREATE_SINGLE_COUPON,
      bulkCoupon: SwaggerExamples.CREATE_BULK_COUPON,
      freeMeals: SwaggerExamples.CREATE_FREE_MEALS_COUPON,
      specificCustomers: SwaggerExamples.CREATE_SPECIFIC_CUSTOMERS_COUPON,
      valueDiscount: SwaggerExamples.CREATE_VALUE_DISCOUNT_COUPON,
    },
  })
  async createCoupon(@Body() createCouponDto: CreateCouponDto) {
    try {
      const data = await this.couponService.createCoupon(createCouponDto);
      return {
        status: true,
        message: message.CREATE_SUCCESS,
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

  @Get('subscription-price-data')
  @ApiOperation({
    summary: 'Get subscription duration days for coupon order type',
  })
  async getSubscriptionPriceData() {
    try {
      const data = await this.couponService.getSubscriptionPriceData();

      return {
        message: message.GET_DETAILS,
        data,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Get('loyalty-options')
  @ApiOperation({
    summary: 'Get coupon loyalty cashback options',
    description:
      'Returns loyalty options where loyalty_type is Coupon, formatted for coupon additional discount dropdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Coupon loyalty options retrieved successfully',
  })
  async getCouponLoyaltyOptions() {
    try {
      const data = await this.couponService.getCouponLoyaltyOptions();

      return {
        status: true,
        message: message.GET_DETAILS,
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

  @Post('create-loyalty')
  @ApiOperation({
    summary: 'Create coupon additional discount loyalty',
  })
  async createCouponLoyalty(@Body() body: any) {
    try {
      const data = await this.couponService.createCouponLoyalty(body);

      return {
        message: data?.message,
        data: data?.data,
        alert: data?.alert,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Get('customer-list')
  @ApiOperation({
    summary: 'Customer list for coupon specific customer eligibility',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async customerListForCoupon(
    @Query('search') search?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      const data = await this.couponService.customerListForCoupon(search, limit);

      return {
        status: true,
        message: message.GET_DETAILS,
        data
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get all coupons',
    description: 'Retrieve a paginated list of all coupons',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'coupon_type', required: false, enum: ['single', 'bulk'] })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    example: 'createdAt',
  })
  @ApiQuery({ name: 'order', required: false, enum: ['1', '-1'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of coupons retrieved successfully',
  })
  async getAllCoupons(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('coupon_type') couponType?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ) {
    try {
      const data = await this.couponService.getAllCoupons(
        Number(page),
        Number(limit),
        couponType,
        sort,
        order,
        search,
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
  @ApiOperation({
    summary: 'Get coupon by ID',
    description: 'Retrieve a specific coupon by its ID',
  })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  async getCouponById(@Param('id') id: string) {
    try {
      const data = await this.couponService.getCouponById(id);

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

  @Put(':id')
  @ApiBody({
    type: UpdateCouponDto,
    examples: {
      updateSingleCoupon: SwaggerExamples.UPDATE_SINGLE_COUPON,
      updateBulkCoupon: SwaggerExamples.UPDATE_BULK_COUPON,
    },
  })
  async updateCoupon(
    @Param('id') id: string,
    @Body() updateData: UpdateCouponDto,
    @Query('campaignName') campaignName?: string,
  ) {
    try {
      const data = await this.couponService.updateCoupon(
        id,
        updateData,
        campaignName,
      );

      return {
        message: message.UPDATE_SUCCESS,
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
  async deleteCoupon(@Param('id') id: string) {
    try {
      const data = await this.couponService.deleteCoupon(id);

      return {
        message: message.DELETE_SUCCESS,
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
}