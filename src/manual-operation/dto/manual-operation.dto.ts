import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const CUSTOMER_VERIFY_REQUIRED_FIELDS = [
  'email',
  'whatsapp_country_code',
  'whatsapp_number',
  'phone_number',
  'country_code',
  'first_name',
  'last_name',
] as const;

export type SourceInfo = {
  platform: 'delicut' | 'KMS';
  source: 'manual_order' | 'cx_team_lead' | 'phone_lead';
  /** Lead stage from cart: RNR | DQL | MQL | SQL */
  stage?: string;
  /** MQL sub-stage (same as leadstagehistories.sub_stage). */
  sub_stage?: string;
};

export enum PlatformCartPlan {
  NORMAL = 'normal',
  FLEXI = 'flexi',
  SMART_SAVER = 'smart_saver',
}

/** Example v5 cart/save body (PUT platform/cart/:customer_id or POST platform/cart/save) */
export const PLATFORM_CART_V5_SAVE_EXAMPLE = {
  cart_item: [
    {
      is_recommended: false,
      is_vegetarian: false,
      avoid_ingredients: [],
      avoid_category: [],
      plan_duration_in_days: 20,
      delivery_days: 5,
      qty: 1,
      price: 1710,
      per_day_price: 85.5,
      selected_meal_type: [
        {
          meal_type: 'lunch',
          kcal_range: 'Medium',
          kcal: '1000 - 1100 Kcal',
          qty: 1,
          protein_category: 'balance',
          is_veg: false,
          meal_category: 'meal',
        },
        {
          meal_type: 'dinner',
          kcal_range: 'Medium',
          kcal: '1000 - 1100 Kcal',
          qty: 1,
          protein_category: 'balance',
          is_veg: false,
          meal_category: 'meal',
        },
        {
          meal_type: 'morning_snack',
          kcal_range: 'Medium',
          kcal: '1000 - 1100 Kcal',
          qty: 1,
          protein_category: 'balance',
          is_veg: false,
          meal_category: 'snack',
        },
      ],
      delivery_start_date: '2026-06-01T00:00:00.000Z',
    },
  ],
  customer_id: '6a157d9841f37cc54335c96b',
  cart_type: 'subscription',
  type_of_cart: 'new',
  valid_cart: true,
  cart_goal: 'gain-muscle',
  period_start_date: '2026-05-26T00:00:00.000Z',
  plan: 'normal',
} as const;

/** Partial cart fields staff can edit in kitchen before v5 cart/save */
export class PlatformCartUpdatesDto {
  @ApiProperty({
    description: 'Delivery start date (YYYY-MM-DD or ISO)',
    required: false,
    example: '2026-06-01',
  })
  @IsString()
  @IsOptional()
  delivery_start_date?: string;

  @ApiProperty({ required: false, example: '2026-05-26' })
  @IsString()
  @IsOptional()
  period_start_date?: string;

  @ApiProperty({ required: false, example: 'gain-muscle' })
  @IsString()
  @IsOptional()
  cart_goal?: string;

  @ApiProperty({ enum: PlatformCartPlan, required: false })
  @IsEnum(PlatformCartPlan)
  @IsOptional()
  plan?: PlatformCartPlan;

  @ApiProperty({ required: false, enum: ['new', 're-new'] })
  @IsString()
  @IsOptional()
  type_of_cart?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  valid_cart?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  refferalCode?: string;

  @ApiProperty({ required: false, example: 'subscription' })
  @IsString()
  @IsOptional()
  cart_type?: string;

  @ApiProperty({
    description: 'Full v5 cart/save cart_item array (same as pre-prod web)',
    required: false,
    example: PLATFORM_CART_V5_SAVE_EXAMPLE.cart_item,
  })
  @IsArray()
  @IsOptional()
  cart_item?: Record<string, unknown>[];
}

export enum PaymentType {
  CHECKOUT = 'checkout',
  CHECKOUT_LINK = 'checkout_link',
  CASH = 'cash',
  CARD = 'card',
  WALLET = 'wallet',
}

export class GetByCustomerIdDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '69785cdb33b40e7f5bc62af8',
  })
  @IsNotEmpty()
  customer_id: string;
}
export class PlatformCartSaveDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a157d9841f37cc54335c96b',
  })
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description:
      'Optional raw customer JWT (same Authorization token used for platform /api/v1/* calls). If provided, kitchen token generation is skipped.',
    required: false,
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5pY2tAZ21hYWlsLmlvIiwiaWF0IjoxNzgwMzA2NTUyLCJleHAiOjE4MTE4NDI1NTJ9.G1mFgSp_w--iAdGkKUc4vRELS0Hw9xWFd1qA2VmXrq0',
  })
  @IsString()
  @IsOptional()
  customer_token?: string;

  @ApiProperty({
    description: 'Kitchen edits applied on top of v4 cart before v5 save',
    required: false,
  })
  @ValidateNested()
  @Type(() => PlatformCartUpdatesDto)
  @IsOptional()
  cart_updates?: PlatformCartUpdatesDto;

  @ApiProperty({
    description:
      'Full v5 cart/save body from kitchen UI. Takes precedence over cart_updates.',
    required: false,
    example: PLATFORM_CART_V5_SAVE_EXAMPLE,
  })
  @IsObject()
  @IsOptional()
  cart_save_body?: Record<string, unknown>;
}

export class UpdatePlatformCartDto extends PlatformCartUpdatesDto {
  @ApiProperty({
    description:
      'Optional nested v5 body. Root-level fields (see PLATFORM_CART_V5_SAVE_EXAMPLE) are preferred.',
    required: false,
    example: PLATFORM_CART_V5_SAVE_EXAMPLE,
  })
  @IsObject()
  @IsOptional()
  cart_save_body?: Record<string, unknown>;
}

export class PlatformCouponApplyDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a157d9841f37cc54335c96b',
  })
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: 'Coupon code to apply on platform',
    example: 'SAVE10',
  })
  @IsString()
  @IsNotEmpty()
  coupon_code: string;
}

export class PlatformCouponRemoveDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a157d9841f37cc54335c96b',
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;
}

/** Proxies platform POST /api/v3/cart/available-deliverydate */
export class PlatformAvailableDeliveryDateDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a182d00e2bd0942369a2a3b',
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: 'Deliverable days per week',
    example: 5,
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  delivery_days: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  delivery_type?: string;

  @ApiProperty({ required: false, example: 'normal' })
  @IsString()
  @IsOptional()
  plan?: string;

  @ApiProperty({
    description:
      'Optional raw customer JWT. If omitted, kitchen resolves token for the customer.',
    required: false,
  })
  @IsString()
  @IsOptional()
  customer_token?: string;
}

/** Delivery details for platform POST /api/v2/cart/attach-details */
export class PlatformCartDeliveryDetailsDto {
  @ApiProperty({ required: false, example: '6a1eb185f66ef69e2ffa4169' })
  @IsString()
  @IsOptional()
  address_id?: string;

  @ApiProperty({ required: false, example: 'Work' })
  @IsString()
  @IsOptional()
  address_type?: string;

  @ApiProperty({ required: false, example: 'Dubai' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ required: false, example: 'Pearl Jumeirah' })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiProperty({ required: false, example: 'United Arab Emirates' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false, example: 'csquare' })
  @IsString()
  @IsOptional()
  full_address?: string;

  @ApiProperty({ example: '3AM - 6AM' })
  @IsString()
  @IsNotEmpty()
  slot: string;

  @ApiProperty({ type: [String], example: [] })
  @IsArray()
  instruction: string[];

  @ApiProperty({
    required: false,
    enum: ['paper_bag_deposite', 'box_deposite'],
    example: 'box_deposite',
  })
  @IsString()
  @IsOptional()
  apply_refund_deposite?: string;
}

/** Proxies platform POST /api/v2/cart/attach-details */
export class PlatformCartAttachDetailsDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a181c21e2bd0942369a26fb',
  })
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: 'Delivery start date (ISO)',
    example: '2026-06-05T00:00:00.000Z',
  })
  @IsString()
  @IsNotEmpty()
  delivery_start_date: string;

  @ApiProperty({ type: PlatformCartDeliveryDetailsDto })
  @ValidateNested()
  @Type(() => PlatformCartDeliveryDetailsDto)
  delivery_details: PlatformCartDeliveryDetailsDto;

  @ApiProperty({
    description:
      'Optional raw customer JWT. If omitted, kitchen resolves token for the customer.',
    required: false,
  })
  @IsString()
  @IsOptional()
  customer_token?: string;
}

/** Proxies platform POST /api/v2/address/save */
export class PlatformAddressSaveDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a181c21e2bd0942369a26fb',
  })
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({ example: 'Work' })
  @IsString()
  @IsNotEmpty()
  address_type: string;

  @ApiProperty({ example: 'csquare' })
  @IsString()
  @IsNotEmpty()
  full_address: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'United Arab Emirates' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'Pearl Jumeirah' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '3AM - 6AM' })
  @IsString()
  @IsNotEmpty()
  slot: string;

  @ApiProperty({ type: [String], example: [] })
  @IsArray()
  @IsOptional()
  instruction?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bag_info?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  default_address?: boolean;

  @ApiProperty({
    description:
      'Optional raw customer JWT. If omitted, kitchen resolves token for the customer.',
    required: false,
  })
  @IsString()
  @IsOptional()
  customer_token?: string;
}

/** Proxies platform POST /api/v2/address/update/:addressId */
export class PlatformAddressUpdateDto {
  @ApiProperty({
    description: 'Customer MongoDB ID',
    example: '6a181c21e2bd0942369a26fb',
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  @IsNotEmpty()
  address_type: string;

  @ApiProperty({ example: 'csquare v2' })
  @IsString()
  @IsNotEmpty()
  full_address: string;

  @ApiProperty({ example: 'Dubai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'United Arab Emirates' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'Pearl Jumeirah' })
  @IsString()
  @IsNotEmpty()
  province: string;

  @ApiProperty({ example: '3AM - 6AM' })
  @IsString()
  @IsNotEmpty()
  slot: string;

  @ApiProperty({ type: [String], example: [] })
  @IsArray()
  @IsOptional()
  instruction?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bag_info?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  default_address?: boolean;

  @ApiProperty({
    description:
      'Optional raw customer JWT. If omitted, kitchen resolves token for the customer.',
    required: false,
  })
  @IsString()
  @IsOptional()
  customer_token?: string;
}

/** Update profile fields and mark customer verified (manual operation). */
export class VerifyCustomerDto {
  @ApiProperty({ required: false, example: 'John' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ required: false, example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '+971' })
  @IsOptional()
  @IsString()
  country_code?: string;

  @ApiProperty({ required: false, example: '501234567' })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({ required: false, example: '+971' })
  @IsOptional()
  @IsString()
  whatsapp_country_code?: string;

  @ApiProperty({ required: false, example: '551234567' })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;
}

/** Example for POST /manual-operation/order/create → platform v1/order/create */
export const PLATFORM_ORDER_CREATE_EXAMPLE = {
  cartId: '69aa6dc946c777d5bd4bd289',
  customer_id: '6a157d9841f37cc54335c96b',
  payment_type: 'checkout_link',
} as const;

export class CreateOrderWithCustomerTokenDto {
  @ApiProperty({
    description: 'Platform cart ID (from v5 cart/save or platform cart)',
    example: '69aa6dc946c777d5bd4bd289',
  })
  @IsString()
  @IsNotEmpty()
  cartId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '6a157d9841f37cc54335c96b',
  })
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description:
      'Use checkout_link for payment link with redirect URL; checkout uses payment session',
    example: 'checkout_link',
    enum: PaymentType,
    default: PaymentType.CHECKOUT_LINK,
    required: false,
  })
  @IsEnum(PaymentType)
  @IsOptional()
  payment_type?: PaymentType;
}

export class SendRnrFollowupNotificationDto {
  @ApiProperty({
    description:
      'Customer ID — WhatsApp destination and first_name come from the customer profile',
    example: '699e98a07783534f42882e2d',
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;
}

export class SendMenuSharingNotificationDto {
  @ApiProperty({
    description:
      'Customer ID — WhatsApp destination and first_name come from the customer profile',
    example: '699e98a07783534f42882e2d',
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: 'Weekly menu URL sent as template variable {{2}}',
    example: 'https://pre.delicut.click/',
  })
  @IsString()
  @IsNotEmpty()
  weekly_menu_link: string;
}

export class SendPaymentLinkNotificationDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '69f9a7497284e219663cd249',
  })
  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description:
      'Cart ID — required to load plan, goal, diet, duration, and amount for the template',
    example: '6a1d8c77605622ff4233c343',
  })
  @IsString()
  @IsNotEmpty()
  cart_id: string;

  @ApiProperty({
    description: 'Checkout redirect URL to send on WhatsApp',
    example: 'https://pay.sandbox.checkout.com/link/pl_5HaywKZbal5Y',
  })
  @IsString()
  @IsNotEmpty()
  redirect_url: string;
}

export class CreateOrderWithOTPDto {
  @ApiProperty({
    description: 'OTP',
    example: '1234',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '69785cdb33b40e7f5bc62af8',
  })
  @IsNotEmpty()
  customer_id: string;
}
export class CreateManualOrderDto {
  @ApiProperty({
    description: 'Cart ID',
    example: '69788ee03172f0c6c1361eec',
  })
  @IsNotEmpty()
  cartId: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '69785cdb33b40e7f5bc62af8',
  })
  @IsNotEmpty()
  customer_id: string;
  @ApiProperty({
    description: 'Payment Type',
    example: 'checkout_link',
    enum: PaymentType,
  })
  @IsEnum(PaymentType)
  @IsOptional()
  payment_type?: PaymentType;
}

export class UpdateDeliveryStartDateDto {
  @ApiProperty({
    description: 'Cart ID',
    example: '69788ee03172f0c6c1361eec',
  })
  @IsNotEmpty()
  cart_id: string;

  @ApiProperty({
    description: 'New Start Date in YYYY-MM-DD format',
    example: '2024-12-15',
  })
  @IsNotEmpty()
  delivery_start_date: string;
}
export class ValidateDeliveryDateDto {
  @ApiProperty({
    description: 'Cart ID',
    example: '69788ee03172f0c6c1361eec',
  })
  @IsNotEmpty()
  cart_id: string;

  @ApiProperty({
    description: 'Proposed Delivery Date in YYYY-MM-DD format',
    example: '2024-12-20',
  })
  @IsNotEmpty()
  proposed_date: string;
}
