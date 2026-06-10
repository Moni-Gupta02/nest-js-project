import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateManualOrderDto,
  CreateOrderWithCustomerTokenDto,
  CreateOrderWithOTPDto,
  GetByCustomerIdDto,
  PaymentType,
  PlatformCartUpdatesDto,
  SourceInfo,
  UpdateDeliveryStartDateDto,
  VerifyCustomerDto,
  CUSTOMER_VERIFY_REQUIRED_FIELDS,
} from './dto/manual-operation.dto';
import {
  AuthenticationFailedException,
  CartNotFoundException,
  InvalidDeliveryDateException,
  OrderCreationFailedException,
} from './exceptions/manual-operations.exception';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { CartDocument } from 'src/cart/Schemas/cart.schema';
import { CouponDocument } from 'src/coupon/schemas/coupon.schema';
import { AddressDocument } from 'src/address/schemas/address.schema';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { WhatsappNotificationService } from 'src/notification_master/whatsapp-notification.service';
import { WHATSAPP_NOTIFICATION_CHANNELS } from 'src/notification_master/constants/whatsapp-notification-channels';
import type { SendWhatsappNotificationResult } from 'src/notification_master/whatsapp-notification.service';
import {
  buildPhoneLeadOrderSourceInfo,
  isOrderSourceLeadStageCode,
  LEAD_STAGE,
  MQL_SUB_STAGE_CODES,
  resolveLeadHistorySource,
} from 'src/deliver-finance-reports/constants/lead-funnel.constants';
import { LeadStageHistoryDocument } from 'src/deliver-finance-reports/schemas/lead-stage-history.schema';

@Injectable()
export class ManualOperationService {
  private readonly baseUrl = (process.env.BACKEND_API_URL || '').trim();

  private async resolveLeadStageCodeForCart(
    cartId: string,
  ): Promise<string | null> {
    const cart = await this.cartModel
      .findById(cartId)
      .select('lead_stage_code')
      .lean();
    if (isOrderSourceLeadStageCode(cart?.lead_stage_code)) {
      return cart.lead_stage_code;
    }

    const latestHistory = await this.getLatestLeadStageHistoryForCart(cartId);
    const historyStage = latestHistory?.to_stage;
    if (isOrderSourceLeadStageCode(historyStage)) {
      return historyStage;
    }

    return null;
  }

  private async resolveKmsSubStageForCart(
    cartId: string,
  ): Promise<string | null> {
    const cart = await this.cartModel
      .findById(cartId)
      .select('sub_stage lead_stage_code')
      .lean();
    if (
      cart?.sub_stage &&
      MQL_SUB_STAGE_CODES.includes(
        cart.sub_stage as (typeof MQL_SUB_STAGE_CODES)[number],
      )
    ) {
      return cart.sub_stage;
    }

    const latestHistory = await this.getLatestLeadStageHistoryForCart(cartId);
    const historySubStage = latestHistory?.sub_stage;
    if (
      historySubStage &&
      MQL_SUB_STAGE_CODES.includes(
        historySubStage as (typeof MQL_SUB_STAGE_CODES)[number],
      )
    ) {
      return historySubStage;
    }

    return null;
  }

  private async buildOrderSourceInfoForCart(
    cartId: string,
    sourceOverride?: SourceInfo['source'],
  ): Promise<SourceInfo> {
    const [leadStageCode, subStage] = await Promise.all([
      this.resolveLeadStageCodeForCart(cartId),
      this.resolveKmsSubStageForCart(cartId),
    ]);
    const source = sourceOverride ?? resolveLeadHistorySource(subStage);
    return buildPhoneLeadOrderSourceInfo(
      source,
      leadStageCode,
      subStage,
      'KMS',
    );
  }

  /** @deprecated Use buildOrderSourceInfoForCart */
  private async buildKmsSourceInfoForCart(
    cartId: string,
    sourceOverride?: SourceInfo['source'],
  ): Promise<SourceInfo> {
    return this.buildOrderSourceInfoForCart(cartId, sourceOverride);
  }

  private getCartIdHistoryFilter(cartId: string) {
    if (!Types.ObjectId.isValid(cartId)) {
      return { cart_id: cartId };
    }

    const objectId = new Types.ObjectId(cartId);
    return { cart_id: { $in: [objectId, cartId] } };
  }

  private toCartObjectId(cartId: string) {
    return Types.ObjectId.isValid(cartId) ? new Types.ObjectId(cartId) : cartId;
  }

  private async getLatestLeadStageHistoryForCart(cartId: string) {
    return this.leadStageHistoryModel
      .findOne(this.getCartIdHistoryFilter(cartId))
      .sort({ changed_at: -1, createdAt: -1 })
      .lean();
  }

  private async resolveOrderSourceFromLeadStage(
    cartId: string,
  ): Promise<SourceInfo['source']> {
    const subStage = await this.resolveKmsSubStageForCart(cartId);
    return resolveLeadHistorySource(subStage);
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly whatsappNotificationService: WhatsappNotificationService,
    @InjectModel('Cart') private readonly cartModel: Model<CartDocument>,
    @InjectModel('coupons') private readonly couponModel: Model<CouponDocument>,
    @InjectModel('Customer')
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel('Addresses')
    private readonly addressModel: Model<AddressDocument>,
    @InjectModel('LeadStageHistory')
    private readonly leadStageHistoryModel: Model<LeadStageHistoryDocument>,
  ) {}

  private getLeadStageLabel(stageCode: string): string {
    const stageLabels: Record<string, string> = {
      RNR: 'Raw / Not Responded',
      DQL: 'Disqualified Lead',
      MQL: 'Marketing Qualified Lead',
      SQL: 'Sales Qualified Lead',
      CONVERTED: 'Payment Completed',
    };

    return stageLabels[stageCode] || 'Raw / Not Responded';
  }

  private async markLeadAsSqlAfterLinkGeneration(
    cartId: string,
    customer_id: string,
  ): Promise<void> {
    const cart = await this.cartModel.findById(cartId).lean();
    if (!cart) {
      return;
    }

    const latestHistory = await this.getLatestLeadStageHistoryForCart(cartId);
    const previousStage =
      latestHistory?.to_stage ?? cart.lead_stage_code ?? null;
    if (previousStage === LEAD_STAGE.SQL) {
      return;
    }

    const updatedAt = new Date();
    const sqlHistorySource = resolveLeadHistorySource(
      null,
      latestHistory?.sub_stage,
    );

    await this.cartModel.updateOne(
      { _id: cartId },
      {
        $set: {
          lead_stage_code: LEAD_STAGE.SQL,
          lead_stage_label: this.getLeadStageLabel(LEAD_STAGE.SQL),
          lead_stage_updated_at: updatedAt,
        },
      },
    );

    const historyPayload: Record<string, unknown> = {
      cart_id: this.toCartObjectId(cartId),
      customer_id,
      to_stage: LEAD_STAGE.SQL,
      changed_at: updatedAt,
      source: sqlHistorySource,
      note: 'Payment link generated',
    };
    if (previousStage) {
      historyPayload.from_stage = previousStage;
    }
    await this.leadStageHistoryModel.create(historyPayload);
  }

  private hasGeneratedPaymentLink(orderResult: any): boolean {
    const checkoutLink = orderResult?.checkout_link;
    const transaction = orderResult?.transaction;

    return Boolean(
      checkoutLink?.url ||
        checkoutLink?.link ||
        checkoutLink?.redirect_url ||
        transaction?.url ||
        transaction?.redirect_url ||
        transaction?._links?.redirect?.href,
    );
  }

  private extractPaymentLink(orderResult: any): string {
    return (
      orderResult?.checkout_link?.redirect_url ||
      orderResult?.transaction?.redirect_url ||
      orderResult?.transaction?._links?.redirect?.href ||
      orderResult?.checkout_link?.url ||
      orderResult?.checkout_link?.link ||
      orderResult?.transaction?.url ||
      ''
    );
  }

  private toReadablePlanName(plan?: unknown): string {
    if (typeof plan !== 'string' || !plan.trim()) {
      return '';
    }
    return plan
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveMealsPerDay(cartItem: any): string {
    const selectedMealType = Array.isArray(cartItem?.selected_meal_type)
      ? cartItem.selected_meal_type
      : [];
    if (selectedMealType.length > 0) {
      return String(selectedMealType.length);
    }

    const selectedMeal = Array.isArray(cartItem?.selected_meal)
      ? cartItem.selected_meal
      : [];
    if (selectedMeal.length > 0) {
      return String(selectedMeal.length);
    }
    return '';
  }

  private formatWhatsappQueuedResponse(
    channel: string,
    payload: Record<string, unknown>,
    result: SendWhatsappNotificationResult,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      customer_id: payload.customer_id,
      phone_number: payload.phone_number,
      country_code: payload.country_code,
      phone_source: payload.phone_source,
      channel,
      sqs_message_id: result.messageId ?? null,
      notification_history_id:
        result.notificationData?.whatsapp_messageId ?? null,
      delivery_status: 'queued',
      delivery_note:
        'WhatsApp is sent asynchronously by the notification worker (SQS). Check notification_histories.status for this id.',
      ...extra,
    };
  }

  private async sendPhoneSalesPaymentLinkNotification(
    customerId: string,
    cartId: string,
    orderResult: any,
    redirectUrlOverride?: string,
  ): Promise<Record<string, unknown> | null> {
    const [customer, cart] = await Promise.all([
      this.customerModel.findById(customerId).lean().exec(),
      this.cartModel.findById(cartId).lean().exec(),
    ]);

    if (!customer || !cart) {
      console.log(
        `Skipping payment-link notification: missing customer/cart for customer ${customerId}, cart ${cartId}`,
      );
      return null;
    }

    const cartData = cart as any;
    const cartItem = Array.isArray(cart.cart_item) ? cart.cart_item[0] : null;
    const paymentLink =
      redirectUrlOverride?.trim() || this.extractPaymentLink(orderResult);
    if (!paymentLink) {
      console.log(
        `Skipping payment-link notification: no payment link for cart ${cartId}`,
      );
      return null;
    }

    const rawAmount = cartData.final_total ?? cartData.cart_total ?? 0;
    const totalAmount = Number.parseFloat(String(rawAmount));

    const { payload, result } =
      await this.whatsappNotificationService.sendWhatsappToCustomer(
        WHATSAPP_NOTIFICATION_CHANNELS.PHONE_SALES_PAYMENT_LINK,
        customerId,
        customer,
        {
          plan_name: this.toReadablePlanName(cart.plan),
          goal: cartData.cart_goal || '',
          diet_type:
            (typeof cartItem?.protein_category === 'string'
              ? cartItem.protein_category
              : Array.isArray(cartItem?.protein_category)
                ? cartItem.protein_category[0]
                : '') || '',
          meals_per_day: this.resolveMealsPerDay(cartItem),
          plan_duration:
            cartItem?.plan_duration_in_days != null
              ? String(cartItem.plan_duration_in_days)
              : '',
          total_amount: Number.isNaN(totalAmount)
            ? '0.00'
            : totalAmount.toFixed(2),
          payment_link: paymentLink,
          language: 'EN',
        },
      );

    return this.formatWhatsappQueuedResponse(
      WHATSAPP_NOTIFICATION_CHANNELS.PHONE_SALES_PAYMENT_LINK,
      payload,
      result,
      {
        cart_id: cartId,
        payment_link: paymentLink,
      },
    );
  }

  async sendPaymentLinkNotification(
    customerId: string,
    cartId: string,
    redirectUrl: string,
  ): Promise<Record<string, unknown>> {
    if (!customerId?.trim()) {
      throw new BadRequestException('customer_id is required');
    }
    if (!cartId?.trim()) {
      throw new BadRequestException('cart_id is required');
    }
    if (!redirectUrl?.trim()) {
      throw new BadRequestException('redirect_url is required');
    }

    const data = await this.sendPhoneSalesPaymentLinkNotification(
      customerId.trim(),
      cartId.trim(),
      {},
      redirectUrl.trim(),
    );

    if (!data) {
      throw new BadRequestException(
        'Could not send payment link notification: customer/cart not found or invalid data',
      );
    }

    return data;
  }

  async sendRnrFollowupNotification(
    customerId: string,
  ): Promise<Record<string, unknown>> {
    if (!customerId?.trim()) {
      throw new BadRequestException('customer_id is required');
    }

    const customer = await this.customerModel
      .findById(customerId.trim())
      .select(
        'email first_name last_name phone_number country_code whatsapp_number whatsapp_country_code',
      )
      .lean()
      .exec();

    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }

    const { payload, result } =
      await this.whatsappNotificationService.sendWhatsappToCustomer(
        WHATSAPP_NOTIFICATION_CHANNELS.RNR_FOLLOWUP,
        customerId.trim(),
        customer,
        { language: 'en' },
      );

    return this.formatWhatsappQueuedResponse(
      WHATSAPP_NOTIFICATION_CHANNELS.RNR_FOLLOWUP,
      payload,
      result,
    );
  }

  async sendMenuSharingNotification(
    customerId: string,
    weeklyMenuLink: string,
  ): Promise<Record<string, unknown>> {
    if (!customerId?.trim()) {
      throw new BadRequestException('customer_id is required');
    }
    if (!weeklyMenuLink?.trim()) {
      throw new BadRequestException('weekly_menu_link is required');
    }

    const customer = await this.customerModel
      .findById(customerId.trim())
      .select(
        'email first_name last_name phone_number country_code whatsapp_number whatsapp_country_code',
      )
      .lean()
      .exec();

    if (!customer) {
      throw new NotFoundException(`Customer not found: ${customerId}`);
    }

    const { payload, result } =
      await this.whatsappNotificationService.sendWhatsappToCustomer(
        WHATSAPP_NOTIFICATION_CHANNELS.MENU_SHARING,
        customerId.trim(),
        customer,
        {
          weekly_menu_link: weeklyMenuLink.trim(),
          language: 'en',
        },
      );

    return this.formatWhatsappQueuedResponse(
      WHATSAPP_NOTIFICATION_CHANNELS.MENU_SHARING,
      payload,
      result,
      { weekly_menu_link: weeklyMenuLink.trim() },
    );
  }
  private async attachCouponDetailsToCart(
    cart: Record<string, any>,
  ): Promise<Record<string, any>> {
    const rawCouponId = cart.coupon_id;
    if (!rawCouponId) {
      return {
        ...cart,
        coupon_code: null,
        coupon_name: null,
        coupon_title: null,
      };
    }

    const couponId =
      typeof rawCouponId === 'object' && rawCouponId?._id
        ? String(rawCouponId._id)
        : String(rawCouponId);

    if (!Types.ObjectId.isValid(couponId)) {
      return {
        ...cart,
        coupon_code: null,
        coupon_name: null,
        coupon_title: null,
      };
    }

    const coupon = await this.couponModel
      .findById(couponId)
      .select('coupon_code name coupon_title')
      .lean();

    return {
      ...cart,
      coupon_id: couponId,
      coupon_code: coupon?.coupon_code ?? null,
      coupon_name: coupon?.name ?? null,
      coupon_title: coupon?.coupon_title ?? null,
    };
  }

  /**
   * Resolves cart by cart _id first. If not found, tries latest completed cart
   * for customer_id, then falls back to latest cart of any status.
   */
  async getCartByCustomerId(getCartDto: GetByCustomerIdDto): Promise<any> {
    const { customer_id: cartOrCustomerId } = getCartDto;

    console.log(`Fetching cart by id or customer: ${cartOrCustomerId}`);

    try {
      if (Types.ObjectId.isValid(cartOrCustomerId)) {
        const cartById = await this.cartModel
          .findById(cartOrCustomerId)
          .lean()
          .exec();

        if (cartById) {
          console.log(
            `Cart found by id: ${cartById._id} (status: ${cartById.cart_status})`,
          );
          return this.attachCouponDetailsToCart(cartById);
        }
      }

      const cart = await this.cartModel
        .findOne({
          customer_id: cartOrCustomerId,
        })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();

      if (!cart) {
        console.log(`No cart found for customer: ${cartOrCustomerId}`);
        throw new CartNotFoundException(cartOrCustomerId);
      }

      console.log(`Cart found: ${cart._id} with status: ${cart.cart_status}`);

      return this.attachCouponDetailsToCart(cart);
    } catch (error) {
      if (error instanceof CartNotFoundException) {
        throw error;
      }
      console.log(
        `Error fetching cart for ${cartOrCustomerId}`,
        error instanceof Error ? error.stack : error,
      );
      throw new CartNotFoundException(cartOrCustomerId);
    }
  }
  private getPlatformKitchenHeaders() {
    const apiKey = (process.env.KITCHEN_MODULE_API_KEY || '').trim();

    return {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'x-kitchen-module-api-key': apiKey,
    };
  }

  private getCustomerAuthHeaders(customerToken: string) {
    const authorization = (customerToken || '').trim();

    return {
      accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: authorization,
    };
  }

  private ensurePlatformApiConfigured(): void {
    if (!this.baseUrl) {
      throw new HttpException(
        'BACKEND_API_URL is not configured on kitchen module',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private extractPlatformErrorMessage(
    data: unknown,
    fallbackMessage: string,
  ): string {
    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }

    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }

    return fallbackMessage;
  }

  private throwPlatformApiError(
    error: unknown,
    fallbackMessage: string,
    options?: { forwardClientStatus?: boolean },
  ): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = this.extractPlatformErrorMessage(
        error.response?.data,
        fallbackMessage,
      );

      console.log(
        `Platform API error: ${status} - ${JSON.stringify(error.response?.data)}`,
      );

      if (
        options?.forwardClientStatus &&
        status &&
        status >= HttpStatus.BAD_REQUEST &&
        status < HttpStatus.INTERNAL_SERVER_ERROR
      ) {
        throw new HttpException(message, status);
      }

      throw new OrderCreationFailedException(message);
    }

    throw new OrderCreationFailedException(fallbackMessage);
  }

  private extractPlatformData(response: { data?: { data?: any } }): any {
    return response.data?.data;
  }

  private async resolveCustomerToken(customerId: string): Promise<string> {
    const tokenData = await this.getCustomerDirectToken(customerId);
    return tokenData.x_acess_token;
  }

  /** Proxies platform GET /api/v4/cart/get_details/:customerId */
  async getPlatformCartDetailsForCustomer(customerId: string): Promise<any> {
    const customerToken = await this.resolveCustomerToken(customerId);
    const cart = await this.getPlatformCartDetails(customerId, customerToken);
    const save_payload = this.buildCartSavePayload(cart, customerId);
    return { cart, customer_id: customerId, save_payload };
  }

  /** Apply kitchen edits onto platform cart from v4 get_details */
  private mergePlatformCartUpdates(
    cart: any,
    updates?: PlatformCartUpdatesDto,
  ): any {
    if (!updates) {
      return cart;
    }

    const merged = {
      ...cart,
      ...(updates.cart_goal != null ? { cart_goal: updates.cart_goal } : {}),
      ...(updates.plan != null ? { plan: updates.plan } : {}),
      ...(updates.type_of_cart != null
        ? { type_of_cart: updates.type_of_cart }
        : {}),
      ...(updates.valid_cart != null ? { valid_cart: updates.valid_cart } : {}),
      ...(updates.refferalCode != null
        ? { refferalCode: updates.refferalCode }
        : {}),
      ...(updates.period_start_date != null
        ? { period_start_date: updates.period_start_date }
        : {}),
      ...(updates.cart_type != null ? { cart_type: updates.cart_type } : {}),
    };

    if (updates.cart_item?.length) {
      merged.cart_item = updates.cart_item;
    } else if (updates.delivery_start_date) {
      const deliveryIso = this.toPlatformDeliveryDateString(
        updates.delivery_start_date,
      );
      const items = Array.isArray(merged.cart_item)
        ? merged.cart_item
        : merged.cart_item
          ? [merged.cart_item]
          : [];
      merged.cart_item = items.map((item: any) => ({
        ...item,
        delivery_start_date: deliveryIso,
      }));
      merged.delivery_start_date = deliveryIso;
    }

    return merged;
  }

  private buildSavePayloadFromV5Body(
    customerId: string,
    body: Record<string, unknown>,
  ): Record<string, unknown> {
    const items = Array.isArray(body.cart_item) ? body.cart_item : [];

    return {
      customer_id: customerId,
      cart_type: body.cart_type || 'subscription',
      type_of_cart: body.type_of_cart || 'new',
      valid_cart: body.valid_cart ?? true,
      plan: body.plan || 'normal',
      ...(body.cart_goal ? { cart_goal: body.cart_goal } : {}),
      ...(body.period_start_date
        ? { period_start_date: this.toIsoDateString(body.period_start_date) }
        : {}),
      ...(body.refferalCode ? { refferalCode: body.refferalCode } : {}),
      cart_item: items.map((item) => this.normalizeCartItemForSave(item)),
    };
  }

  private isFullV5CartBody(body?: Record<string, unknown>): boolean {
    return (
      Array.isArray(body?.cart_item) &&
      (body.cart_item as unknown[]).length > 0 &&
      !!body.cart_type
    );
  }

  private async preparePlatformCartSavePayload(
    customerId: string,
    customerToken: string,
    options?: {
      cartSaveBody?: Record<string, unknown>;
      cartUpdates?: PlatformCartUpdatesDto;
    },
  ): Promise<{ savePayload: Record<string, unknown>; cartDetails: any }> {
    const explicitBody = options?.cartSaveBody;
    const updatesBody = options?.cartUpdates as
      | Record<string, unknown>
      | undefined;

    if (this.isFullV5CartBody(explicitBody)) {
      return {
        cartDetails: null,
        savePayload: this.buildSavePayloadFromV5Body(customerId, explicitBody!),
      };
    }

    // Root-level PUT body: { cart_item, cart_type, plan, ... } (no cart_save_body wrapper)
    if (this.isFullV5CartBody(updatesBody)) {
      return {
        cartDetails: null,
        savePayload: this.buildSavePayloadFromV5Body(customerId, updatesBody!),
      };
    }

    const cartDetails = await this.getPlatformCartDetails(
      customerId,
      customerToken,
    );
    const mergedCart = this.mergePlatformCartUpdates(
      cartDetails,
      options?.cartUpdates,
    );
    const savePayload = this.buildCartSavePayload(mergedCart, customerId);

    return { savePayload, cartDetails };
  }

  private async getPlatformCartDetails(
    customerId: string,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get<any>(
        `${this.baseUrl}/api/v4/cart/get_details/${customerId}`,
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    const cart = this.extractPlatformData(response);
    if (!cart?._id) {
      throw new CartNotFoundException(customerId);
    }

    return cart;
  }

  private toIsoDateString(value: unknown): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  }

  /** Platform validate48HoursService expects YYYY-MM-DD (not full ISO). */
  private toPlatformDeliveryDateString(value: unknown): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    const raw = String(value).trim();
    const ymd = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (ymd) {
      return ymd[1];
    }
    const date = value instanceof Date ? value : new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private inferMealCategory(mealType: string): string {
    const type = (mealType || '').toLowerCase();
    if (type === 'breakfast') {
      return 'breakfast';
    }
    if (
      type === 'snack' ||
      type === 'morning_snack' ||
      type === 'evening_snack'
    ) {
      return 'snack';
    }
    if (type === 'goodies') {
      return 'goodies';
    }
    return 'meal';
  }

  private normalizeSelectedMealType(
    items: any[],
    fallbackProteinCategory?: string,
  ) {
    return (items || []).map((meal) => {
      const mealType = meal?.meal_type || meal?.mealType || 'lunch';
      const proteinCategory =
        meal?.protein_category ||
        fallbackProteinCategory ||
        meal?.proteinCategory ||
        'low';

      return {
        meal_type: mealType,
        kcal_range: meal?.kcal_range || meal?.kcalRange || 'Medium',
        kcal: meal?.kcal || '',
        qty: meal?.qty ?? 1,
        protein_category: proteinCategory,
        is_veg: meal?.is_veg ?? meal?.is_vegetarian ?? false,
        meal_category:
          meal?.meal_category ||
          meal?.mealCategory ||
          this.inferMealCategory(mealType),
      };
    });
  }

  /** Shape cart items like pre-prod web client POST /api/v5/cart/save */
  private normalizeCartItemForSave(item: any) {
    const itemForPlatform = item && typeof item === 'object' ? { ...item } : {};
    if ('address_data' in itemForPlatform) {
      delete itemForPlatform.address_data;
    }

    const selectedMealType = this.normalizeSelectedMealType(
      itemForPlatform?.selected_meal_type ||
        itemForPlatform?.selectedMealType ||
        [],
      typeof itemForPlatform?.protein_category === 'string'
        ? itemForPlatform.protein_category
        : itemForPlatform?.protein_category?.[0],
    );

    return {
      is_recommended: itemForPlatform?.is_recommended ?? false,
      is_vegetarian: itemForPlatform?.is_vegetarian ?? false,
      avoid_ingredients: Array.isArray(itemForPlatform?.avoid_ingredients)
        ? itemForPlatform.avoid_ingredients
        : [],
      avoid_category: Array.isArray(itemForPlatform?.avoid_category)
        ? itemForPlatform.avoid_category
        : [],
      plan_duration_in_days: itemForPlatform?.plan_duration_in_days,
      delivery_days: itemForPlatform?.delivery_days,
      qty: itemForPlatform?.qty ?? 1,
      price: itemForPlatform?.price,
      per_day_price: itemForPlatform?.per_day_price,
      selected_meal_type: selectedMealType,
      delivery_start_date: this.toPlatformDeliveryDateString(
        itemForPlatform?.delivery_start_date,
      ),
      ...(itemForPlatform?.delivery_details
        ? { delivery_details: itemForPlatform.delivery_details }
        : {}),
      ...(itemForPlatform?.body_metrics
        ? { body_metrics: itemForPlatform.body_metrics }
        : {}),
    };
  }

  private buildCartSavePayload(cart: any, customerId: string) {
    const rawItems = Array.isArray(cart?.cart_item)
      ? cart.cart_item
      : cart?.cart_item
        ? [cart.cart_item]
        : [];

    if (!rawItems.length) {
      throw new CartNotFoundException(customerId);
    }

    const plan =
      cart.plan ||
      (cart.is_flex_plan === true
        ? 'flexi'
        : cart.is_flex_plan === false
          ? 'normal'
          : 'normal');

    const cartItems = rawItems.map((item) =>
      this.normalizeCartItemForSave(item),
    );

    const payload: Record<string, unknown> = {
      customer_id: customerId,
      cart_type: cart.cart_type || 'subscription',
      cart_item: cartItems,
      type_of_cart: cart.type_of_cart || 'new',
      valid_cart: cart.valid_cart ?? true,
      plan,
    };

    if (cart.cart_goal) {
      payload.cart_goal = cart.cart_goal;
    }

    const periodStart = this.toIsoDateString(cart.period_start_date);
    if (periodStart) {
      payload.period_start_date = periodStart;
    }

    if (cart.refferalCode) {
      payload.refferalCode = cart.refferalCode;
    }

    return payload;
  }

  /** Update platform cart from kitchen (v4 get → merge edits → v5 save). */
  async updatePlatformCartForCustomer(
    customerId: string,
    updates?: PlatformCartUpdatesDto,
    cartSaveBody?: Record<string, unknown>,
    customerTokenOverride?: string,
  ): Promise<any> {
    try {
      const customerToken =
        customerTokenOverride?.trim() ||
        (await this.resolveCustomerToken(customerId));
      const { savePayload, cartDetails } =
        await this.preparePlatformCartSavePayload(customerId, customerToken, {
          cartSaveBody,
          cartUpdates: updates,
        });
      const saveResult = await this.savePlatformCartWithDeliveryDateRetry(
        savePayload,
        customerToken,
        customerId,
      );

      return {
        customer_id: customerId,
        cart_details: cartDetails,
        save_payload: saveResult.save_payload,
        saved_cart: saveResult.cart,
        delivery_start_date: saveResult.delivery_start_date,
        requested_delivery_start_date: saveResult.requested_delivery_start_date,
        delivery_date_auto_corrected: saveResult.delivery_date_auto_corrected,
      };
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to save platform cart', {
        forwardClientStatus: true,
      });
    }
  }

  /** Proxies platform POST /api/v5/cart/save */
  async savePlatformCartForCustomer(
    customerId: string,
    options?: {
      cartSaveBody?: Record<string, unknown>;
      cartUpdates?: PlatformCartUpdatesDto;
      customerToken?: string;
    },
  ): Promise<any> {
    if (!customerId?.trim()) {
      throw new BadRequestException('customer_id is required');
    }

    const cartSaveBody = options?.cartSaveBody;
    const cartUpdates = options?.cartUpdates;
    if (!cartSaveBody && !cartUpdates) {
      throw new BadRequestException(
        'Provide either cart_save_body or cart_updates',
      );
    }

    if (cartSaveBody) {
      const bodyCustomerId =
        typeof cartSaveBody.customer_id === 'string'
          ? cartSaveBody.customer_id.trim()
          : '';
      if (!bodyCustomerId) {
        throw new BadRequestException('cart_save_body.customer_id is required');
      }
      if (bodyCustomerId !== customerId) {
        throw new BadRequestException(
          'customer_id and cart_save_body.customer_id must match',
        );
      }

      if (
        !Array.isArray(cartSaveBody.cart_item) ||
        !cartSaveBody.cart_item.length
      ) {
        throw new BadRequestException(
          'cart_save_body.cart_item must be a non-empty array',
        );
      }
    }

    return this.updatePlatformCartForCustomer(
      customerId,
      cartUpdates,
      cartSaveBody,
      options?.customerToken,
    );
  }

  private resolveDeliveryDaysFromSavePayload(
    payload: Record<string, unknown>,
  ): number {
    const items = Array.isArray(payload.cart_item) ? payload.cart_item : [];
    const deliveryDays = Number(
      (items[0] as Record<string, unknown>)?.delivery_days,
    );
    return Number.isFinite(deliveryDays) && deliveryDays > 0 ? deliveryDays : 5;
  }

  private applyDeliveryStartDateToSavePayload(
    payload: Record<string, unknown>,
    deliveryStartDate: string,
  ): Record<string, unknown> {
    const formatted = this.toPlatformDeliveryDateString(deliveryStartDate);
    if (!formatted) {
      return payload;
    }

    const cartItems = Array.isArray(payload.cart_item)
      ? (payload.cart_item as Record<string, unknown>[]).map((item) => ({
          ...item,
          delivery_start_date: formatted,
        }))
      : [];

    return {
      ...payload,
      cart_item: cartItems,
    };
  }

  private getRequestedDeliveryStartDateFromPayload(
    payload: Record<string, unknown>,
  ): string | undefined {
    const items = Array.isArray(payload.cart_item) ? payload.cart_item : [];
    const first = items[0] as Record<string, unknown> | undefined;
    return first?.delivery_start_date
      ? String(first.delivery_start_date)
      : undefined;
  }

  /**
   * POST /api/v5/cart/save — on invalid_delivery_date (e.g. smart_saver weekday rules),
   * fetches /api/v3/cart/available-deliverydate and retries with the earliest valid date.
   */
  private async savePlatformCartWithDeliveryDateRetry(
    payload: Record<string, unknown>,
    customerToken: string,
    customerId: string,
  ): Promise<{
    cart: any;
    save_payload: Record<string, unknown>;
    delivery_date_auto_corrected: boolean;
    requested_delivery_start_date?: string;
    delivery_start_date?: string;
    available_delivery_dates?: unknown;
  }> {
    const requested = this.getRequestedDeliveryStartDateFromPayload(payload);

    try {
      const cart = await this.savePlatformCart(payload, customerToken);
      return {
        cart,
        save_payload: payload,
        delivery_date_auto_corrected: false,
        requested_delivery_start_date: requested,
        delivery_start_date: this.toPlatformDeliveryDateString(
          requested ?? cart?.delivery_start_date,
        ),
      };
    } catch (error) {
      if (!this.isInvalidDeliveryDatePlatformError(error)) {
        throw error;
      }

      const deliveryDays = this.resolveDeliveryDaysFromSavePayload(payload);
      const plan = String(payload.plan || 'normal');
      const availableResponse = await this.getPlatformAvailableDeliveryDate(
        customerId,
        deliveryDays,
        customerToken,
        {
          deliveryType: String(payload.cart_type || 'subscription'),
          plan,
        },
      );

      const correctedDate =
        this.extractAvailableDeliveryStartDate(availableResponse);
      const correctedPayload = this.applyDeliveryStartDateToSavePayload(
        payload,
        correctedDate,
      );
      const cart = await this.savePlatformCart(correctedPayload, customerToken);

      await this.syncLocalCartDeliveryStartDate(customerId, correctedDate);

      return {
        cart,
        save_payload: correctedPayload,
        delivery_date_auto_corrected: true,
        requested_delivery_start_date: requested,
        delivery_start_date: this.toPlatformDeliveryDateString(correctedDate),
        available_delivery_dates: availableResponse?.data ?? availableResponse,
      };
    }
  }

  private async savePlatformCart(
    payload: Record<string, unknown>,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post<any>(`${this.baseUrl}/api/v5/cart/save`, payload, {
        headers: this.getCustomerAuthHeaders(customerToken),
      }),
    );

    const cart = this.extractPlatformData(response);
    if (!cart?._id) {
      throw new OrderCreationFailedException(
        'Cart save did not return a cart id',
      );
    }

    return cart;
  }

  /** Proxies platform POST /api/v1/coupon/apply */
  async applyPlatformCouponForCustomer(
    customerId: string,
    couponCode: string,
  ): Promise<any> {
    this.ensurePlatformApiConfigured();

    try {
      const customerToken = await this.resolveCustomerToken(customerId);
      const result = await this.applyPlatformCoupon(
        couponCode.trim(),
        customerId,
        customerToken,
      );
      return {
        customer_id: customerId,
        coupon_code: couponCode.trim(),
        result,
      };
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to apply coupon', {
        forwardClientStatus: true,
      });
    }
  }

  private async applyPlatformCoupon(
    couponCode: string,
    customerId: string,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post<any>(
        `${this.baseUrl}/api/v1/coupon/apply`,
        { coupon_code: couponCode, customer_id: customerId },
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    return response.data;
  }

  /** Proxies platform POST /api/v1/cart/remove-coupon */
  async removePlatformCouponForCustomer(customerId: string): Promise<any> {
    this.ensurePlatformApiConfigured();

    try {
      const customerToken = await this.resolveCustomerToken(customerId);
      const result = await this.removePlatformCoupon(customerId, customerToken);
      return {
        customer_id: customerId,
        result,
      };
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to remove coupon', {
        forwardClientStatus: true,
      });
    }
  }

  private async removePlatformCoupon(
    customerId: string,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post<any>(
        `${this.baseUrl}/api/v1/cart/remove-coupon`,
        { customer_id: customerId },
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    return response.data;
  }

  /** Proxies platform POST /api/v3/cart/available-deliverydate */
  async getPlatformAvailableDeliveryDateForCustomer(
    customerId: string,
    deliveryDays: number,
    options?: {
      deliveryType?: string;
      plan?: string;
      customerToken?: string;
    },
  ): Promise<any> {
    this.ensurePlatformApiConfigured();

    try {
      const customerToken =
        options?.customerToken?.trim() ||
        (await this.resolveCustomerToken(customerId));
      const result = await this.getPlatformAvailableDeliveryDate(
        customerId,
        deliveryDays,
        customerToken,
        options,
      );
      return {
        customer_id: customerId,
        delivery_days: deliveryDays,
        result,
      };
    } catch (error) {
      this.throwPlatformApiError(
        error,
        'Failed to fetch available delivery dates',
        {
          forwardClientStatus: true,
        },
      );
    }
  }

  private async getPlatformAvailableDeliveryDate(
    customerId: string,
    deliveryDays: number,
    customerToken: string,
    options?: { deliveryType?: string; plan?: string },
  ): Promise<any> {
    const payload: Record<string, unknown> = {
      customer_id: customerId,
      delivery_days: deliveryDays,
    };
    if (options?.deliveryType) {
      payload.delivery_type = options.deliveryType;
    }
    if (options?.plan) {
      payload.plan = options.plan;
    }

    const response = await firstValueFrom(
      this.httpService.post<any>(
        `${this.baseUrl}/api/v3/cart/available-deliverydate`,
        payload,
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    return response.data;
  }

  private isInvalidDeliveryDatePlatformError(error: unknown): boolean {
    if (!(error instanceof AxiosError)) {
      return false;
    }

    const message = this.extractPlatformErrorMessage(
      error.response?.data,
      '',
    ).toLowerCase();

    return (
      message.includes('invalid_delivery_date') ||
      message.includes('select upcoming delivery start date') ||
      message.includes('upcoming delivery')
    );
  }

  private resolveDeliveryDaysFromPlatformCart(cart: any): number {
    const items = Array.isArray(cart?.cart_item) ? cart.cart_item : [];
    const deliveryDays = Number(items[0]?.delivery_days);
    return Number.isFinite(deliveryDays) && deliveryDays > 0 ? deliveryDays : 5;
  }

  private collectAvailableDatesFromPayload(payload: unknown): Date[] {
    const dates: Date[] = [];
    const addDate = (value: unknown) => {
      if (value == null || value === '') {
        return;
      }
      const parsed = new Date(value as string | number | Date);
      if (!Number.isNaN(parsed.getTime())) {
        dates.push(parsed);
      }
    };

    if (!payload || typeof payload !== 'object') {
      return dates;
    }

    const root = payload as Record<string, unknown>;
    const nested =
      root.data && typeof root.data === 'object'
        ? (root.data as Record<string, unknown>)
        : null;

    for (const source of [root, nested].filter(Boolean)) {
      const obj = source as Record<string, unknown>;
      addDate(obj.availableWeeklyDate);
      addDate(obj.availableMonthlyDate);

      if (Array.isArray(obj.available_dates)) {
        obj.available_dates.forEach(addDate);
      }
      if (Array.isArray(obj.dates)) {
        obj.dates.forEach(addDate);
      }
    }

    return dates;
  }

  /** Always picks the earliest available date (ascending). */
  private extractAvailableDeliveryStartDate(availableResponse: any): string {
    const payload = availableResponse?.data ?? availableResponse;
    const candidates = this.collectAvailableDatesFromPayload(payload);

    if (!candidates.length) {
      throw new BadRequestException(
        'No available delivery date returned from platform',
      );
    }

    candidates.sort((a, b) => a.getTime() - b.getTime());
    return candidates[0].toISOString();
  }

  private async syncLocalCartDeliveryStartDate(
    customerId: string,
    deliveryStartDate: string,
  ): Promise<void> {
    const date = new Date(deliveryStartDate);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const cart = await this.cartModel
      .findOne({ customer_id: customerId })
      .sort({ updatedAt: -1 })
      .select('_id')
      .lean()
      .exec();

    if (!cart?._id) {
      return;
    }

    await this.cartModel.findByIdAndUpdate(cart._id, {
      $set: {
        delivery_start_date: date,
        'cart_item.$[].delivery_start_date': date,
      },
    });
  }

  /** Proxies platform POST /api/v2/cart/attach-details */
  async attachPlatformCartDetailsForCustomer(
    customerId: string,
    deliveryStartDate: string,
    deliveryDetails: Record<string, unknown>,
    customerTokenOverride?: string,
  ): Promise<any> {
    this.ensurePlatformApiConfigured();

    const requestedDeliveryStartDate = deliveryStartDate;
    let deliveryStartDateToUse = deliveryStartDate;
    let deliveryDateAutoCorrected = false;

    try {
      const customerToken =
        customerTokenOverride?.trim() ||
        (await this.resolveCustomerToken(customerId));

      try {
        const result = await this.attachPlatformCartDetails(
          customerId,
          deliveryStartDateToUse,
          deliveryDetails,
          customerToken,
        );
        return {
          customer_id: customerId,
          delivery_start_date: deliveryStartDateToUse,
          requested_delivery_start_date: requestedDeliveryStartDate,
          delivery_date_auto_corrected: deliveryDateAutoCorrected,
          result,
        };
      } catch (error) {
        if (!this.isInvalidDeliveryDatePlatformError(error)) {
          throw error;
        }

        const platformCart = await this.getPlatformCartDetails(
          customerId,
          customerToken,
        );
        const deliveryDays =
          this.resolveDeliveryDaysFromPlatformCart(platformCart);
        const availableResponse = await this.getPlatformAvailableDeliveryDate(
          customerId,
          deliveryDays,
          customerToken,
          {
            deliveryType: 'subscription',
            plan: platformCart?.plan || 'normal',
          },
        );

        deliveryStartDateToUse =
          this.extractAvailableDeliveryStartDate(availableResponse);
        deliveryDateAutoCorrected = true;

        const result = await this.attachPlatformCartDetails(
          customerId,
          deliveryStartDateToUse,
          deliveryDetails,
          customerToken,
        );

        await this.syncLocalCartDeliveryStartDate(
          customerId,
          deliveryStartDateToUse,
        );

        return {
          customer_id: customerId,
          delivery_start_date: deliveryStartDateToUse,
          requested_delivery_start_date: requestedDeliveryStartDate,
          delivery_date_auto_corrected: deliveryDateAutoCorrected,
          available_delivery_dates:
            availableResponse?.data ?? availableResponse,
          result,
        };
      }
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to attach cart details', {
        forwardClientStatus: true,
      });
    }
  }

  private async attachPlatformCartDetails(
    customerId: string,
    deliveryStartDate: string,
    deliveryDetails: Record<string, unknown>,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post<any>(
        `${this.baseUrl}/api/v2/cart/attach-details`,
        {
          customer_id: customerId,
          delivery_start_date: deliveryStartDate,
          delivery_details: deliveryDetails,
        },
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    return response.data;
  }

  /** Proxies platform POST /api/v2/address/save */
  async savePlatformAddressForCustomer(
    customerId: string,
    addressBody: Record<string, unknown>,
    customerTokenOverride?: string,
  ): Promise<any> {
    this.ensurePlatformApiConfigured();

    try {
      const customerToken =
        customerTokenOverride?.trim() ||
        (await this.resolveCustomerToken(customerId));
      const result = await this.savePlatformAddress(
        { ...addressBody, customer_id: customerId },
        customerToken,
      );
      return {
        customer_id: customerId,
        result,
      };
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to save address', {
        forwardClientStatus: true,
      });
    }
  }

  /** Proxies platform POST /api/v2/address/update/:addressId */
  async updatePlatformAddressForCustomer(
    addressId: string,
    customerId: string,
    addressBody: Record<string, unknown>,
    customerTokenOverride?: string,
  ): Promise<any> {
    this.ensurePlatformApiConfigured();

    if (!addressId?.trim()) {
      throw new BadRequestException('address_id is required');
    }

    try {
      const customerToken =
        customerTokenOverride?.trim() ||
        (await this.resolveCustomerToken(customerId));
      const result = await this.updatePlatformAddress(
        addressId.trim(),
        { ...addressBody, customer_id: customerId },
        customerToken,
      );
      return {
        customer_id: customerId,
        address_id: addressId.trim(),
        result,
      };
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to update address', {
        forwardClientStatus: true,
      });
    }
  }

  private async savePlatformAddress(
    payload: Record<string, unknown>,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post<any>(
        `${this.baseUrl}/api/v2/address/save`,
        payload,
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    return response.data;
  }

  private async updatePlatformAddress(
    addressId: string,
    payload: Record<string, unknown>,
    customerToken: string,
  ): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.post<any>(
        `${this.baseUrl}/api/v2/address/update/${addressId}`,
        payload,
        { headers: this.getCustomerAuthHeaders(customerToken) },
      ),
    );

    return response.data;
  }

  async customerSignIn(customer_id: string) {
    const customer = await this.customerModel
      .findById(customer_id)
      .where('user_register_flag')
      .equals('user_verified')
      .lean()
      .exec();
    console.log(`Initiating sign-in for email: ${customer?.email}`);
    const userEmail = customer?.email;
    try {
      if (userEmail) {
        console.log(`Requesting OTP for email: ${userEmail}`);

        await firstValueFrom(
          this.httpService.post(
            `${this.baseUrl}/api/v1/customer/sign-in?is_simulation=true`,
            { email: userEmail },
            {
              headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        console.log(`OTP sent to email: ${userEmail}`);

        return {
          email: userEmail,
          message: `OTP has been sent. Use OTP for simulation.`,
        };
      } else {
        throw new AuthenticationFailedException(
          'Customer is not verified or does not exist',
        );
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(
          `Authentication API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw new AuthenticationFailedException(
          error.response?.data?.message || 'Authentication failed',
        );
      }
      throw error;
    }
  }

  async getCustomerDirectToken(customer_id: string) {
    if (!(process.env.KITCHEN_MODULE_API_KEY || '').trim()) {
      throw new AuthenticationFailedException(
        'KITCHEN_MODULE_API_KEY is not configured',
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<any>(
          `${this.baseUrl}/api/v3/customer/kitchen-token/${customer_id}`,
          {
            headers: this.getPlatformKitchenHeaders(),
          },
        ),
      );
      console.log('response', response.data);

      if (!response.data?.data?.x_acess_token) {
        throw new AuthenticationFailedException(
          'No token received from authentication',
        );
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(
          `Authentication API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw new AuthenticationFailedException(
          error.response?.data?.message || 'Authentication failed',
        );
      }
      throw error;
    }
  }

  async getAuthToken(email: string, otp: string): Promise<string> {
    try {
      console.log(`Verifying OTP for email: ${email}`);
      const response = await firstValueFrom(
        this.httpService.post<any>(
          `${this.baseUrl}/api/v1/customer/sign-in?is_simulation=true`,
          { email, otp },
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data?.data?.x_acess_token) {
        throw new AuthenticationFailedException(
          'No token received from authentication',
        );
      }

      return response.data.data.x_acess_token;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(
          `Authentication API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw new AuthenticationFailedException(
          error.response?.data?.message || 'Authentication failed',
        );
      }
      throw error;
    }
  }
  /** Map platform order/create response (order_id + transaction with redirect link) */
  private mapOrderCreateResponse(
    rawResponse: any,
    cartId: string,
    customer_id: string,
    payment_type: string,
    source_info?: SourceInfo,
  ): any {
    const platform = rawResponse?.data ?? rawResponse;

    return {
      status: 'created',
      message: 'Order created successfully',
      cartId,
      customer_id,
      payment_type,
      source_info: platform.source_info ?? source_info,
      checkout_link: platform.checkout_link ?? {},
      order_id: platform.order_id || platform.orderId || platform._id,
      transaction: platform.transaction ?? {},
    };
  }

  /** Used by order/create-complete (OTP flow). Does not create lead stage. */
  async createOrder(
    token: string,
    createOrderDto: CreateManualOrderDto,
  ): Promise<any> {
    const { cartId, customer_id } = createOrderDto;
    const source_info = await this.buildOrderSourceInfoForCart(
      cartId,
      'manual_order',
    );

    console.log(`Creating order for cart: ${cartId}, customer: ${customer_id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/order/create`,
          {
            cartId,
            customer_id,
            payment_type: 'checkout_link',
            source_info,
          },
          {
            headers: {
              accept: 'application/json, text/plain, */*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              authorization: token,
              'content-type': 'application/json',
            },
          },
        ),
      );

      const result = this.mapOrderCreateResponse(
        response.data,
        cartId,
        customer_id,
        'checkout_link',
        source_info,
      );

      console.log(`Order created successfully: ${result.order_id}`);

      return result;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(
          `Order creation API error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`,
        );
        throw new OrderCreationFailedException(
          error.response?.data?.message || 'Failed to create order',
        );
      }
      throw new OrderCreationFailedException();
    }
  }

  /** Used by order/create (customer-token flow). Creates SQL stage when payment link is generated. */
  private async createPlatformOrder(
    customerToken: string,
    cartId: string,
    customer_id: string,
    payment_type: string,
  ): Promise<any> {
    const source_info = await this.buildOrderSourceInfoForCart(cartId);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/order/create`,
          { cartId, customer_id, payment_type, source_info },
          {
            headers: {
              accept: 'application/json, text/plain, */*',
              'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
              authorization: customerToken,
              'content-type': 'application/json',
            },
          },
        ),
      );

      const result = this.mapOrderCreateResponse(
        response.data,
        cartId,
        customer_id,
        payment_type,
        source_info,
      );

      if (this.hasGeneratedPaymentLink(result)) {
        await this.markLeadAsSqlAfterLinkGeneration(cartId, customer_id);
      } else {
        console.log(
          `Skipping SQL lead stage update for cart ${cartId}: payment link not generated`,
        );
      }

      console.log(`Order created successfully: ${result.order_id}`);

      return result;
    } catch (error) {
      this.throwPlatformApiError(error, 'Failed to create order');
    }
  }

  /**
   * Create order on platform (no OTP): kitchen-token → POST /api/v1/order/create
   */
  async createOrderWithCustomerToken(
    dto: CreateOrderWithCustomerTokenDto,
  ): Promise<any> {
    const {
      customer_id,
      cartId,
      payment_type = PaymentType.CHECKOUT_LINK,
    } = dto;

    console.log(
      `Creating platform order for customer: ${customer_id}, cart: ${cartId}`,
    );

    try {
      const customerToken = await this.resolveCustomerToken(customer_id);

      return await this.createPlatformOrder(
        customerToken,
        cartId,
        customer_id,
        payment_type,
      );
    } catch (error) {
      if (
        error instanceof AuthenticationFailedException ||
        error instanceof OrderCreationFailedException
      ) {
        throw error;
      }
      console.log(
        `Failed customer-token order for ${customer_id}`,
        error instanceof Error ? error.stack : error,
      );
      throw new OrderCreationFailedException();
    }
  }

  async createOrderWithOTP(
    createOrderDto: CreateOrderWithOTPDto,
  ): Promise<any> {
    const { otp, customer_id } = createOrderDto;

    console.log(
      `Starting complete order creation flow for customer: ${customer_id}`,
    );

    try {
      const customerEmail = await this.customerModel
        .findById(customer_id)
        .where('user_register_flag')
        .equals('user_verified')
        .select('email')
        .lean()
        .exec();
      if (!customerEmail?.email) {
        throw new AuthenticationFailedException(
          'Customer is not verified or does not exist',
        );
      }

      const email = customerEmail.email;
      const token = await this.getAuthToken(email, otp);
      console.log('Authentication successful');

      // Step 2: Get cart if not provided

      // Validate provided cart
      const cart = await this.cartModel
        .findOne({
          customer_id: customer_id,
          cart_status: 'completed',
        })
        .select('_id cart_status')
        .lean()
        .exec();

      if (!cart) {
        console.log(`No completed cart found for customer: ${customer_id}`);
        throw new CartNotFoundException(customer_id);
      }

      console.log(`Cart found: ${cart._id} with status: ${cart.cart_status}`);
      // Step 3: Create order
      const order = await this.createOrder(token, {
        cartId: cart._id,
        customer_id,
        payment_type: PaymentType.CHECKOUT_LINK,
      });

      console.log(`Order created successfully: ${order.order_id}`);

      return order;
    } catch (error) {
      console.log(
        `Failed to create order for customer ${customer_id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Fetch customer details by customer id.
   */
  async getCustomerDetailsById(
    customerId: string,
  ): Promise<Record<string, unknown>> {
    const customer = await this.customerModel
      .findById(customerId)
      .lean()
      .exec();
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      customer_id: customerId,
      customer,
    };
  }

  /**
   * Fetch customer addresses by customer id.
   */
  async getCustomerAddressListById(
    customerId: string,
  ): Promise<Record<string, unknown>> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer_id');
    }

    const customerObjectId = new Types.ObjectId(customerId);
    const addresses = await this.addressModel
      .find({ customer_id: customerObjectId })
      .sort({
        default_address: -1,
        is_default: -1,
        updatedAt: -1,
        createdAt: -1,
      })
      .lean()
      .exec();

    return {
      customer_id: customerId,
      addresses,
      count: addresses.length,
    };
  }

  /**
   * Validate customer exists
   */
  async validateCustomer(customerId: string): Promise<boolean> {
    try {
      const customer = await this.customerModel
        .findById(customerId)
        .lean()
        .exec();
      return !!customer;
    } catch (error) {
      console.log(`Error validating customer ${customerId}`, error.stack);
      return false;
    }
  }

  async updateDeliveryStartDate(
    updateDto: UpdateDeliveryStartDateDto,
  ): Promise<any> {
    const { cart_id, delivery_start_date } = updateDto;
    const newDate = new Date(delivery_start_date);

    // Validate that the date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    const selectedDate = new Date(newDate);
    selectedDate.setHours(0, 0, 0, 0); // Normalize to start of day

    if (selectedDate <= today) {
      throw new InvalidDeliveryDateException(
        'Delivery start date must be a future date',
      );
    }

    // Validate that the date is not on a weekend (Saturday or Sunday)
    const dayOfWeek = newDate.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      throw new InvalidDeliveryDateException(
        'Delivery start date cannot be on weekends (Saturday or Sunday)',
      );
    }

    // Get cart before update for admin history
    const cartBefore = await this.cartModel
      .findById(cart_id)
      .select('customer_id delivery_start_date')
      .lean()
      .exec();

    if (!cartBefore) {
      throw new CartNotFoundException(cart_id);
    }

    const updatedCart = await this.cartModel.findByIdAndUpdate(
      cart_id,
      {
        $set: {
          delivery_start_date: newDate,
          'cart_item.$[].delivery_start_date': newDate,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedCart) {
      throw new CartNotFoundException(cart_id);
    }

    // Prepare admin history data
    const before_change = {
      cart_id: cart_id,
      previous_delivery_start_date: cartBefore.delivery_start_date
        ? new Date(cartBefore.delivery_start_date).toISOString()
        : null,
    };

    const after_change = {
      cart_id: cart_id,
      new_delivery_start_date: newDate.toISOString(),
      updated_cart_items: updatedCart.cart_item.length,
    };

    const customerId = cartBefore.customer_id.toString();
    let platformSync = null;

    try {
      platformSync = await this.updatePlatformCartForCustomer(customerId, {
        delivery_start_date: delivery_start_date,
      });
    } catch (error) {
      console.log(
        `Platform cart sync failed for customer ${customerId}`,
        error instanceof Error ? error.stack : error,
      );
    }

    return {
      customer_id: customerId,
      before_change,
      after_change,
      platform_sync: platformSync,
      response: {
        success: true,
        message: 'Delivery start date updated successfully',
        data: {
          cart_id: cart_id,
          new_delivery_start_date: newDate.toISOString(),
          updated_cart_items: updatedCart.cart_item.length,
          platform_synced: !!platformSync,
        },
      },
    };
  }

  private static readonly USER_VERIFIED_FLAG = 'user_verified';

  private normalizeVerifyField(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  private buildVerifiedCustomerProfile(
    customer: CustomerDocument,
    dto: VerifyCustomerDto,
  ): Record<(typeof CUSTOMER_VERIFY_REQUIRED_FIELDS)[number], string> {
    const merged = {} as Record<
      (typeof CUSTOMER_VERIFY_REQUIRED_FIELDS)[number],
      string
    >;

    for (const field of CUSTOMER_VERIFY_REQUIRED_FIELDS) {
      const fromDto = this.normalizeVerifyField(
        dto[field as keyof VerifyCustomerDto],
      );
      const fromCustomer = this.normalizeVerifyField(
        customer[field as keyof CustomerDocument],
      );
      const value = fromDto || fromCustomer;

      if (!value) {
        throw new BadRequestException(
          `Missing required field for verification: ${field}`,
        );
      }

      merged[field] = value;
    }

    return merged;
  }

  private async ensureUniqueCustomerContact(
    customerId: string,
    profile: Record<(typeof CUSTOMER_VERIFY_REQUIRED_FIELDS)[number], string>,
    existing: CustomerDocument,
  ): Promise<void> {
    if (profile.email !== this.normalizeVerifyField(existing.email)) {
      const emailInUse = await this.customerModel.findOne({
        email: profile.email,
        _id: { $ne: customerId },
      });
      if (emailInUse) {
        throw new ConflictException('Email already exists');
      }
    }

    if (
      profile.phone_number !== this.normalizeVerifyField(existing.phone_number)
    ) {
      const phoneInUse = await this.customerModel.findOne({
        phone_number: profile.phone_number,
        _id: { $ne: customerId },
      });
      if (phoneInUse) {
        throw new ConflictException('Phone number already exists');
      }
    }
  }

  /**
   * Updates any provided profile fields, validates all mandatory fields, then
   * sets is_verified=true and user_register_flag=user_verified.
   */
  async verifyCustomer(
    customerId: string,
    dto: VerifyCustomerDto,
  ): Promise<Record<string, unknown>> {
    const customer = await this.customerModel.findById(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const profile = this.buildVerifiedCustomerProfile(customer, dto);
    await this.ensureUniqueCustomerContact(customerId, profile, customer);

    const updatePayload = {
      ...profile,
      is_verified: true,
      user_register_flag: ManualOperationService.USER_VERIFIED_FLAG,
    };

    const updatedCustomer = await this.customerModel
      .findByIdAndUpdate(
        customerId,
        { $set: updatePayload },
        { new: true, runValidators: true },
      )
      .lean();

    return {
      customer_id: customerId,
      is_verified: true,
      user_register_flag: ManualOperationService.USER_VERIFIED_FLAG,
      customer: updatedCustomer,
    };
  }

  async getCartDeliveryInfo(cart_id: string): Promise<any> {
    console.log(`Fetching delivery info for cart: ${cart_id}`);

    try {
      const cart = await this.cartModel
        .findById(cart_id)
        .select(
          'delivery_start_date cart_item.delivery_start_date cart_item.end_date cart_item.plan_duration_in_days cart_status',
        )
        .lean()
        .exec();

      if (!cart) {
        throw new CartNotFoundException(cart_id);
      }

      return {
        cart_id: cart_id,
        cart_status: cart.cart_status,
        delivery_start_date: cart.delivery_start_date,
        plan_duration: cart.cart_item[0]?.plan_duration_in_days || null,
        end_date: cart.cart_item[0]?.end_date || null,
        total_cart_items: cart.cart_item?.length || 0,
      };
    } catch (error) {
      if (error instanceof CartNotFoundException) {
        throw error;
      }
      console.log(
        `Error fetching delivery info for cart ${cart_id}`,
        error.stack,
      );
      throw error;
    }
  }
}
