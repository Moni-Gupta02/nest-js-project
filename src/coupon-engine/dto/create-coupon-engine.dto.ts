import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested,
  IsDate,
  IsDateString,
  Min,
  Max,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CouponType {
  SINGLE = 'single',
  BULK = 'bulk',
}

export enum CustomerEligibilityType {
  ALL = 'all',
  NEW = 'new',
  RENEW = 're-new',
  SPECIFIC = 'specific_customers',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  VALUE = 'value',
  FREE_MEALS = 'free_meals',
  FREE_DAYS = 'free_days',
}

export enum EligibilityType {
  DISCOUNT = 'discount',
  CASHBACK = 'cashback',
}

export enum MinimumPurchaseType {
  NO_MINIMUM = 'no_minimum',
  MINIMUM_VALUE = 'minimum_purchase_value',
  MINIMUM_QUANTITY = 'minimum_quantity',
}

export enum MealType {
  ONE_MEAL = '1_meal',
  TWO_MEAL = '2_meal',
  BREAKFAST = 'breakfast',
  ONE_SNACK = '1_snack',
  TWO_SNACK = '2_snack',
  MORNING_SNACK = 'morning_snack',
  EVENING_SNACK = 'evening_snack',
}

export class CouponPatternDto {
  @ApiProperty({
    example: 'XYZ',
    description: 'Coupon prefix/initials',
  })
  @IsString()
  pre_fix: string;

  @ApiPropertyOptional({
    example: '',
    description: 'Random string',
  })
  @IsOptional()
  @IsString()
  random?: string;

  @ApiProperty({
    example: 101,
    description: 'Starting serial number',
  })
  @IsNumber()
  @Min(1)
  serial_number: number;
}

export class FreeMealDto {
  @ApiProperty({
    enum: MealType,
    example: MealType.BREAKFAST,
  })
  @IsEnum(MealType)
  free_meal_type: MealType;

  @ApiProperty({
    example: 7,
    description: 'Number of days for free meal',
  })
  @IsNumber()
  @Min(1)
  @Max(24)
  free_meal_days: number;
}

export class PercentMealDto {
  @ApiProperty({
    enum: MealType,
    example: MealType.ONE_MEAL,
  })
  @IsEnum(MealType)
  meal: MealType;

  @ApiProperty({
    example: 10,
    description: 'Discount percentage for meal',
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  discount: number;
}

export class PreviousSubscriptionDataDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  last_delivery_date?: Date;

  @ApiPropertyOptional({
    example: 30,
  })
  @IsOptional()
  @IsNumber()
  last_delivery_day?: number;

  @ApiPropertyOptional({
    example: [7, 14, 30],
  })
  @IsOptional()
  @IsArray()
  plan_duration_in_days?: number[];

  @ApiPropertyOptional({
    example: ['1_meal', '2_meal'],
  })
  @IsOptional()
  @IsArray()
  selected_meal?: string[];

  @ApiPropertyOptional({
    example: ['balance', 'low'],
  })
  @IsOptional()
  @IsArray()
  diet_type?: string[];
}

export class EligibilityDto {
  @ApiProperty({
    enum: EligibilityType,
    example: EligibilityType.DISCOUNT,
  })
  @IsEnum(EligibilityType)
  eligibility_type: EligibilityType;

  @ApiPropertyOptional({
    example: '6836e9dc0f8b6f68f66389ab',
    description: 'Loyalty ID for additional cashback',
  })
  @IsOptional()
  @IsMongoId()
  loyalty_id?: string;

  @ApiProperty({
    enum: CustomerEligibilityType,
    example: CustomerEligibilityType.ALL,
  })
  @IsEnum(CustomerEligibilityType)
  type_of_order: CustomerEligibilityType;

  @ApiProperty({
    example: ['all'],
  })
  @IsArray()
  diet_type: string[];

  @ApiProperty({
    example: [7, 14, 30],
  })
  @IsArray()
  order_type: (string | number)[];

  @ApiProperty({
    example: ['normal'],
  })
  @IsArray()
  plan_type: string[];

  @ApiProperty({
    example: [],
  })
  @IsArray()
  compulsory_meal: string[];

  @ApiProperty({
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  discount_type: DiscountType;

  @ApiPropertyOptional({
    example: 'overall',
  })
  @IsOptional()
  @IsString()
  percentage_discount_type?: string;

  @ApiPropertyOptional({
    type: [FreeMealDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FreeMealDto)
  free_meal?: FreeMealDto[];

  @ApiPropertyOptional({
    type: [PercentMealDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PercentMealDto)
  percent_meal?: PercentMealDto[];

  @ApiProperty({
    example: 20,
  })
  @IsNumber()
  @Min(0)
  discount_value: number;

  @ApiProperty({
    example: false,
  })
  @IsBoolean()
  use_max_discount: boolean;

  @ApiPropertyOptional({
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_value?: number;

  @ApiProperty({
    enum: MinimumPurchaseType,
    example: MinimumPurchaseType.NO_MINIMUM,
  })
  @IsEnum(MinimumPurchaseType)
  minimum_purchage: MinimumPurchaseType;

  @ApiPropertyOptional({
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimum_purchage_value?: number;

  @ApiProperty({
    example: 1,
  })
  @IsNumber()
  @Min(1)
  limit_per_user: number;

  @ApiProperty({
    example: [],
  })
  @IsArray()
  customer_eligibility_value: string[];

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  use_previous_subs_data?: boolean;

  @ApiPropertyOptional({
    type: PreviousSubscriptionDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreviousSubscriptionDataDto)
  previous_subscription_data?: PreviousSubscriptionDataDto;
}

export class CreateCouponDto {
  @ApiProperty({
    enum: CouponType,
    example: CouponType.SINGLE,
  })
  @IsEnum(CouponType)
  coupon_type: CouponType;

  @ApiPropertyOptional({
    example: 'Summer Sale',
  })
  @IsOptional()
  @IsString()
  single_name?: string;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  auto_apply?: boolean;

  @ApiPropertyOptional({
    example: 'Black Friday Campaign',
  })
  @IsOptional()
  @IsString()
  bulk_name?: string;

  @ApiPropertyOptional({
    example: 'Marketing Agency',
  })
  @IsOptional()
  @IsString()
  agency_name?: string;

  @ApiPropertyOptional({
    example: 'arabic ads',
  })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({
    example: 'Coupon description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['line 1', 'line 2'],
  })
  @IsOptional()
  @IsArray()
  customer_description?: string[];

  @ApiPropertyOptional({
    example: 'Special Offer',
  })
  @IsOptional()
  @IsString()
  customer_label?: string;

  @ApiPropertyOptional({
    example: 'Apply Now',
  })
  @IsOptional()
  @IsString()
  button_title?: string;

  @ApiPropertyOptional({
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total_times_uses?: number;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_live?: boolean;

  @ApiPropertyOptional({
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  need_alphanumeric_code?: boolean;

  @ApiPropertyOptional({
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  customer_display?: boolean;

  @ApiPropertyOptional({
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  no_of_coupons?: number;

  @ApiPropertyOptional({
    type: CouponPatternDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CouponPatternDto)
  coupon_pattern?: CouponPatternDto;

  @ApiPropertyOptional({
    example: 'SUMMER2026',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    example: 'Summer Offer',
  })
  @IsOptional()
  @IsString()
  coupon_title?: string;

  @ApiPropertyOptional({
    example: '2026-06-01',
  })
  @IsOptional()
  @IsString()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    example: '2026-12-31',
  })
  @IsString()
  @IsDateString()
  end_date: string;

  @ApiProperty({
    type: [EligibilityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EligibilityDto)
  eligibility: EligibilityDto[];
}

export class CouponResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  status: boolean;

  @ApiPropertyOptional()
  data?: any;
}