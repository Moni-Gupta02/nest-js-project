import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EligibilityDto } from './create-coupon-engine.dto';

/**
 * DTO for updating a coupon
 * Only allows updating specific fields that are safe to modify after creation
 *
 * NON-EDITABLE FIELDS (automatically preserved from existing coupon):
 * - For Bulk Coupons:
 *   * coupon_pattern.pre_fix (Coupon Initials)
 *   * coupon_pattern.serial_number (Serial Number Starts From)
 *   * need_alphanumeric_code (Add Random Code In Between)
 *
 * VALIDATION RULES:
 * - End Date must be greater than Start Date
 * - order_type should be array of numbers (e.g., [7, 14, 30]) or ["all"]
 */
export class UpdateCouponDto {
  @ApiPropertyOptional({
    example: 'Updated Summer Sale',
    description: 'Updated coupon name/label',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Get 25% off on all orders this summer',
    description: 'Updated description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'Apply Coupon',
    description: 'Updated button title',
  })
  @IsOptional()
  @IsString()
  button_title?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the coupon is active/live',
  })
  @IsOptional()
  @IsBoolean()
  is_live?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to display the coupon to customers',
  })
  @IsOptional()
  @IsBoolean()
  customer_display?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the coupon is auto-applied',
  })
  @IsOptional()
  @IsBoolean()
  auto_apply?: boolean;

  @ApiPropertyOptional({
    example: 500,
    description:
      'Maximum number of times the coupon can be used (for single coupons)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  total_times_uses?: number;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.000Z',
    description: 'Updated end date in ISO 8601 format',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    example: '2024-06-01T00:00:00.000Z',
    description: 'Updated start date in ISO 8601 format',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    type: [EligibilityDto],
    description: 'Updated eligibility criteria',
    example: [
      {
        eligibility_type: 'discount',
        type_of_order: 'all',
        diet_type: ['all'],
        order_type: [7, 14, 30],
        compulsory_meal: [],
        discount_type: 'percentage',
        percentage_discount_type: 'overall',
        discount_value: 20,
        use_max_discount: true,
        max_discount_value: 100,
        minimum_purchage: 'no_minimum',
        minimum_purchage_value: 0,
        limit_per_user: 1,
        customer_eligibility_value: [],
        use_previous_subs_data: false,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EligibilityDto)
  eligibility?: EligibilityDto[];

  @ApiPropertyOptional({
    example: 150,
    description:
      'Number of coupons for bulk campaigns (can only be increased, not decreased)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  no_of_coupons?: number;

  @ApiPropertyOptional({
    example: 'SUMMER2024',
    description: 'Updated coupon code (for single coupons only)',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    example: 'Summer Special - 20% Off',
    description: 'Updated coupon title',
  })
  @IsOptional()
  @IsString()
  coupon_title?: string;
}
