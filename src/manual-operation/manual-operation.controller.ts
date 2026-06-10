import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ManualOperationService } from './manual-operation.service';
import { DeliverFinanceReportsService } from 'src/deliver-finance-reports/deliver-finance-reports.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateOrderWithCustomerTokenDto,
  CreateOrderWithOTPDto,
  PLATFORM_CART_V5_SAVE_EXAMPLE,
  PLATFORM_ORDER_CREATE_EXAMPLE,
  SendMenuSharingNotificationDto,
  SendPaymentLinkNotificationDto,
  SendRnrFollowupNotificationDto,
  PlatformCartSaveDto,
  PlatformAddressUpdateDto,
  PlatformAddressSaveDto,
  PlatformAvailableDeliveryDateDto,
  PlatformCartAttachDetailsDto,
  PlatformCouponApplyDto,
  PlatformCouponRemoveDto,
  UpdateDeliveryStartDateDto,
  UpdatePlatformCartDto,
  VerifyCustomerDto,
} from './dto/manual-operation.dto';
import { Permissions } from '../common/decorators/permission.decorator';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { UpdateLeadStageDto } from 'src/deliver-finance-reports/dto/update-lead-stage.dto';
@ApiTags('Manual Operations')
@Controller('manual-operation')
@ApiBearerAuth('access-token')
export class ManualOperationController {
  constructor(
    private readonly manualOperationsService: ManualOperationService,
    private readonly adminHistoryService: AdminHistoryService,
    private readonly deliverService: DeliverFinanceReportsService,
  ) {}

  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @Get('lead-funnel/stages')
  getLeadFunnelStages() {
    return this.deliverService.getLeadFunnelStages();
  }

  @Permissions({ resource: 'phone_sales_lead', actions: 'update' })
  @Patch('abandoned-cart/lead-stage')
  @ApiBody({ type: UpdateLeadStageDto })
  async updateOpenLeadStage(
    @Body() body: UpdateLeadStageDto,
    @Req() request: any,
  ) {
    const user = request['user'];
    return await this.deliverService.updateOpenLeadStage(body, user);
  }

  @Patch('customer/:customer_id/verify')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'update' })
  @ApiOperation({
    summary: 'Verify customer (manual operation)',
    description:
      'Updates any provided profile fields, requires email, phone, WhatsApp, country code, and name, then sets is_verified=true and user_register_flag=user_verified.',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Customer MongoDB ID',
    example: '6a157d9841f37cc54335c96b',
  })
  async verifyCustomer(
    @Param('customer_id') customer_id: string,
    @Body() dto: VerifyCustomerDto,
  ) {
    const data = await this.manualOperationsService.verifyCustomer(
      customer_id,
      dto,
    );
    return {
      data,
      message: 'Customer verified successfully',
      status: true,
    };
  }

  @Get('customer/:customer_id')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @ApiOperation({
    summary: 'Get customer details by customer ID',
    description: 'Returns customer details for the provided customer_id.',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Customer MongoDB ID',
    example: '6a157d9841f37cc54335c96b',
  })
  async getCustomerDetails(@Param('customer_id') customer_id: string) {
    const data =
      await this.manualOperationsService.getCustomerDetailsById(customer_id);
    return {
      data,
      message: 'Customer details fetched successfully',
      status: true,
    };
  }

  @Get('customer/:customer_id/addresses')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @ApiOperation({
    summary: 'Get customer address list by customer ID',
    description:
      'Returns all addresses from addresses collection for the provided customer_id.',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Customer MongoDB ID',
    example: '6a181c21e2bd0942369a26fb',
  })
  async getCustomerAddresses(@Param('customer_id') customer_id: string) {
    const data =
      await this.manualOperationsService.getCustomerAddressListById(
        customer_id,
      );
    return {
      data,
      message: 'Customer addresses fetched successfully',
      status: true,
    };
  }

  @Get('cart/:customer_id')
  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @ApiOperation({
    summary: 'Get cart by cart ID or customer ID',
    description:
      'If the path param is a cart _id, returns that cart (any status) with coupon_code and coupon_name from coupon_id. Otherwise returns the latest completed cart for the customer.',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Cart MongoDB ID or customer MongoDB ID',
    example: '680b77927cc371f0f2d854a8',
  })
  async getCartByCustomerId(@Param('customer_id') customer_id: string) {
    const data = await this.manualOperationsService.getCartByCustomerId({
      customer_id,
    });
    return {
      data,
      message: 'Cart fetched successfully',
      status: true,
    };
  }
  @Get('user-simulation/:customer_id')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'manual_operations', actions: 'create' })
  @ApiOperation({
    summary: 'Customer sign-in to get authentication token',
    description:
      'Two-step authentication process: 1) Send email to receive OTP, 2) Send email with OTP to get token. In simulation mode, OTP is always "1234".',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Customer MongoDB ID',
    example: '69785cdb33b40e7f5bc62af8',
  })
  async customerSignIn(@Param('customer_id') customer_id: string) {
    const data = await this.manualOperationsService.customerSignIn(customer_id);
    return {
      data,
      message: 'OTP sent successfully',
      status: true,
    };
  }

  @Get('customer-token/:customer_id')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'manual_operations', actions: 'create' })
  @ApiOperation({
    summary: 'Get customer token without OTP (kitchen staff only)',
    description:
      'Returns a customer JWT directly via platform backend. Requires kitchen-module staff permission; platform validates service API key only.',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Customer MongoDB ID',
    example: '69785cdb33b40e7f5bc62af8',
  })
  async getCustomerDirectToken(@Param('customer_id') customer_id: string) {
    const data =
      await this.manualOperationsService.getCustomerDirectToken(customer_id);
    return {
      data,
      message: 'Customer token generated successfully',
      status: true,
    };
  }

  @Get('platform/cart/:customer_id')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @ApiOperation({
    summary: 'Get platform cart for editing (v4)',
    description:
      'Returns platform cart plus save_payload (v5 shape) so kitchen can edit and PUT back.',
  })
  @ApiParam({
    name: 'customer_id',
    description: 'Customer MongoDB ID',
    example: '6a157d9841f37cc54335c96b',
  })
  async getPlatformCartDetails(@Param('customer_id') customer_id: string) {
    const data =
      await this.manualOperationsService.getPlatformCartDetailsForCustomer(
        customer_id,
      );
    return {
      data,
      message: 'Platform cart details fetched successfully',
      status: true,
    };
  }

  @Put('platform/cart/:customer_id')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'update' })
  @ApiOperation({
    summary: 'Update platform cart from kitchen (v5 save)',
    description:
      'Accepts v5 cart/save JSON at root (cart_item, cart_type, plan, …) or nested cart_save_body. Sends POST /api/v5/cart/save to platform.',
  })
  @ApiParam({
    name: 'customer_id',
    example: '6a157d9841f37cc54335c96b',
  })
  @ApiBody({
    type: UpdatePlatformCartDto,
    description:
      'Send v5 cart/save fields at root. customer_id in URL is used for the platform call.',
    examples: {
      fullV5CartSave: {
        summary: 'Gain muscle – lunch, dinner, morning snack',
        value: PLATFORM_CART_V5_SAVE_EXAMPLE,
      },
    },
  })
  async updatePlatformCart(
    @Param('customer_id') customer_id: string,
    @Body() dto: UpdatePlatformCartDto,
    @Req() request: Request,
  ) {
    const user = request['user'];
    const data =
      await this.manualOperationsService.updatePlatformCartForCustomer(
        customer_id,
        dto,
        dto.cart_save_body,
      );

    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_PLATFORM_CART_UPDATE',
      user,
      customer_id,
      data.cart_details,
      data.save_payload,
    );

    return {
      data,
      message: 'Platform cart updated successfully',
      status: true,
    };
  }

  @Post('platform/cart/save')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Save platform cart from kitchen (v5)',
    description:
      'Same as PUT platform/cart/:customer_id — apply cart_updates or cart_save_body then v5 save. On invalid delivery date (e.g. smart_saver weekday rules), auto-picks earliest date from v3 available-deliverydate and retries.',
  })
  @ApiBody({
    type: PlatformCartSaveDto,
    examples: {
      withCartSaveBody: {
        summary: 'Full body via cart_save_body',
        value: {
          customer_id: '6a157d9841f37cc54335c96b',
          cart_save_body: PLATFORM_CART_V5_SAVE_EXAMPLE,
        },
      },
      withRootFields: {
        summary: 'Partial updates on top of v4 cart',
        value: {
          customer_id: '6a157d9841f37cc54335c96b',
          cart_updates: {
            delivery_start_date: '2026-06-01',
            cart_goal: 'gain-muscle',
            plan: 'normal',
          },
        },
      },
    },
  })
  async savePlatformCart(@Body() dto: PlatformCartSaveDto) {
    const data = await this.manualOperationsService.savePlatformCartForCustomer(
      dto.customer_id,
      {
        cartUpdates: dto.cart_updates,
        cartSaveBody: dto.cart_save_body,
        customerToken: dto.customer_token,
      },
    );
    return {
      data,
      message: 'Platform cart saved successfully',
      status: true,
    };
  }

  @Post('platform/coupon/apply')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Apply platform coupon (v1)',
    description:
      'Proxies delicut-platform-backend POST /api/v1/coupon/apply with customer token.',
  })
  async applyPlatformCoupon(@Body() dto: PlatformCouponApplyDto) {
    const data =
      await this.manualOperationsService.applyPlatformCouponForCustomer(
        dto.customer_id,
        dto.coupon_code,
      );
    return {
      data,
      message: 'Coupon applied successfully',
      status: true,
    };
  }

  @Post('platform/coupon/remove')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Remove platform coupon from cart (v1)',
    description:
      'Proxies delicut-platform-backend POST /api/v1/cart/remove-coupon with customer token.',
  })
  async removePlatformCoupon(@Body() dto: PlatformCouponRemoveDto) {
    const data =
      await this.manualOperationsService.removePlatformCouponForCustomer(
        dto.customer_id,
      );
    return {
      data,
      message: 'Coupon removed successfully',
      status: true,
    };
  }

  @Post('platform/cart/available-delivery-date')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @ApiOperation({
    summary: 'Get available delivery dates for customer (v3)',
    description:
      'Proxies delicut-platform-backend POST /api/v3/cart/available-deliverydate with customer token.',
  })
  async getPlatformAvailableDeliveryDate(
    @Body() dto: PlatformAvailableDeliveryDateDto,
  ) {
    const data =
      await this.manualOperationsService.getPlatformAvailableDeliveryDateForCustomer(
        dto.customer_id,
        dto.delivery_days,
        {
          deliveryType: dto.delivery_type,
          plan: dto.plan,
          customerToken: dto.customer_token,
        },
      );
    return {
      data,
      message: 'Available delivery dates fetched successfully',
      status: true,
    };
  }

  @Post('platform/cart/attach-details')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Attach delivery address to platform cart (v2)',
    description:
      'Proxies POST /api/v2/cart/attach-details. On invalid_delivery_date, fetches /api/v3/cart/available-deliverydate, retries with the next valid date, and syncs KMS cart delivery_start_date.',
  })
  async attachPlatformCartDetails(@Body() dto: PlatformCartAttachDetailsDto) {
    const data =
      await this.manualOperationsService.attachPlatformCartDetailsForCustomer(
        dto.customer_id,
        dto.delivery_start_date,
        dto.delivery_details as unknown as Record<string, unknown>,
        dto.customer_token,
      );
    return {
      data,
      message: 'Cart delivery details attached successfully',
      status: true,
    };
  }

  @Post('platform/address/save')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Save customer address on platform (v2)',
    description:
      'Proxies delicut-platform-backend POST /api/v2/address/save with customer token.',
  })
  async savePlatformAddress(@Body() dto: PlatformAddressSaveDto) {
    const { customer_id, customer_token, ...addressBody } = dto;
    const data =
      await this.manualOperationsService.savePlatformAddressForCustomer(
        customer_id,
        addressBody as unknown as Record<string, unknown>,
        customer_token,
      );
    return {
      data,
      message: 'Address saved successfully',
      status: true,
    };
  }

  @Post('platform/address/update/:address_id')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Update customer address on platform (v2)',
    description:
      'Proxies delicut-platform-backend POST /api/v2/address/update/:addressId with customer token.',
  })
  @ApiParam({
    name: 'address_id',
    description: 'Address MongoDB ID',
    example: '6a1eb185f66ef69e2ffa4169',
  })
  async updatePlatformAddress(
    @Param('address_id') address_id: string,
    @Body() dto: PlatformAddressUpdateDto,
  ) {
    const { customer_id, customer_token, ...addressBody } = dto;
    const data =
      await this.manualOperationsService.updatePlatformAddressForCustomer(
        address_id,
        customer_id,
        addressBody as unknown as Record<string, unknown>,
        customer_token,
      );
    return {
      data,
      message: 'Address updated successfully',
      status: true,
    };
  }

  @Post('order/create')
  @HttpCode(HttpStatus.CREATED)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Create order on platform (no OTP)',
    description:
      'Gets customer token, then POST /api/v1/order/create with cartId, customer_id, payment_type only. Update cart first via PUT platform/cart if needed.',
  })
  @ApiBody({
    type: CreateOrderWithCustomerTokenDto,
    examples: {
      checkoutLink: {
        summary: 'Platform order/create (checkout_link + redirect)',
        value: PLATFORM_ORDER_CREATE_EXAMPLE,
      },
    },
  })
  async createOrderWithCustomerToken(
    @Req() request: Request,
    @Body() createOrderDto: CreateOrderWithCustomerTokenDto,
  ): Promise<any> {
    const user = request['user'];
    const result =
      await this.manualOperationsService.createOrderWithCustomerToken(
        createOrderDto,
      );

    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_ORDER_CREATE',
      user,
      createOrderDto.customer_id,
      {},
      {
        order_id: result?.order_id || result?.orderId,
        cart_id: createOrderDto.cartId,
        payment_type: result?.payment_type ?? createOrderDto.payment_type,
        source_info: result?.source_info,
      },
    );

    return {
      data: result,
      message: 'Order created successfully',
      status: true,
    };
  }

  @Post('lead/send-rnr-followup')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Send RNR follow-up WhatsApp',
    description:
      'Queues rnr_followup_notification using customer profile only (name, WhatsApp/phone). No cart_id required.',
  })
  async sendRnrFollowupNotification(
    @Req() request: Request,
    @Body() dto: SendRnrFollowupNotificationDto,
  ): Promise<any> {
    const data = await this.manualOperationsService.sendRnrFollowupNotification(
      dto.customer_id,
    );

    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_RNR_FOLLOWUP',
      request['user'],
      dto.customer_id,
      {},
      data,
    );

    return {
      data,
      message: 'RNR follow-up notification sent successfully',
      status: true,
    };
  }

  @Post('lead/send-menu-sharing')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Send weekly menu sharing WhatsApp',
    description:
      'Queues menu_sharing_notification using customer profile (name, phone) plus weekly_menu_link. No cart_id required.',
  })
  async sendMenuSharingNotification(
    @Req() request: Request,
    @Body() dto: SendMenuSharingNotificationDto,
  ): Promise<any> {
    const data =
      await this.manualOperationsService.sendMenuSharingNotification(
        dto.customer_id,
        dto.weekly_menu_link,
      );

    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_MENU_SHARING',
      request['user'],
      dto.customer_id,
      {},
      data,
    );

    return {
      data,
      message: 'Menu sharing notification sent successfully',
      status: true,
    };
  }

  @Post('order/send-payment-link')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'phone_sales_lead', actions: 'create' })
  @ApiOperation({
    summary: 'Send payment redirect URL on WhatsApp',
    description:
      'Queues phone_sales_payment_link with cart plan details and redirect_url (payment link).',
  })
  async sendPaymentLinkNotification(
    @Req() request: Request,
    @Body() dto: SendPaymentLinkNotificationDto,
  ): Promise<any> {
    const data = await this.manualOperationsService.sendPaymentLinkNotification(
      dto.customer_id,
      dto.cart_id,
      dto.redirect_url,
    );

    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_PAYMENT_LINK',
      request['user'],
      dto.customer_id,
      {},
      data,
    );

    return {
      data,
      message: 'Payment link notification sent successfully',
      status: true,
    };
  }

  @Post('order/create-complete')
  @HttpCode(HttpStatus.CREATED)
  @Permissions({ resource: 'manual_operations', actions: 'create' })
  @ApiOperation({
    summary: 'Create order with complete flow (recommended for support team)',
    description:
      'All-in-one endpoint that handles: 1) Customer authentication, 2) Cart fetching and validation, 3) Order creation with checkout link. This is the recommended endpoint for support team as it handles the entire flow automatically.',
  })
  async createOrderComplete(
    @Req() request: Request,
    @Body() createOrderDto: CreateOrderWithOTPDto,
  ): Promise<any> {
    const user = request['user'];
    const result =
      await this.manualOperationsService.createOrderWithOTP(createOrderDto);

    // Log admin history for manual order creation
    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_ORDER_CREATE',
      user,
      createOrderDto.customer_id,
      {},
      {
        order_id: result?.order_id || result?.orderId,
        cart_id: result?.cartId,
        payment_type: result?.payment_type,
      },
    );

    return {
      data: result,
      message: 'Order created successfully',
      status: true,
    };
  }
  @Put('cart/delivery-date')
  @HttpCode(HttpStatus.OK)
  @Permissions({ resource: 'manual_operations', actions: 'update' })
  @ApiOperation({
    summary: 'Update delivery start date for a completed cart',
    description:
      'Updates KMS cart delivery date and syncs the same date to platform via v5 cart/save.',
  })
  async updateDeliveryStartDate(
    @Req() request: Request,
    @Body() updateDto: UpdateDeliveryStartDateDto,
  ): Promise<any> {
    const user = request['user'];
    const result =
      await this.manualOperationsService.updateDeliveryStartDate(updateDto);

    // Log admin history
    await this.adminHistoryService.createAdminHistory(
      'MANUAL_OPERATION_DELIVERY_DATE_UPDATE',
      user,
      result.customer_id,
      result.before_change,
      result.after_change,
    );

    return {
      data: result.response.data,
      message:
        result.response.message || 'Delivery start date updated successfully',
      status: true,
    };
  }

  /**
   * Get cart delivery information
   */
  @Get('cart/:cart_id/delivery-info')
  @Permissions({ resource: 'manual_operations', actions: 'read' })
  @ApiOperation({
    summary: 'Get cart delivery information',
    description:
      'Retrieves delivery-related information for a cart including start date, end date, and plan duration.',
  })
  @ApiParam({
    name: 'cart_id',
    description: 'Cart MongoDB ID',
    example: '6979edf037434ef989c0d599',
  })
  async getCartDeliveryInfo(@Param('cart_id') cart_id: string): Promise<any> {
    const data =
      await this.manualOperationsService.getCartDeliveryInfo(cart_id);
    return {
      data,
      message: 'Cart delivery information fetched successfully',
      status: true,
    };
  }
}
