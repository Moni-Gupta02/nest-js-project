import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger examples for Coupon API documentation
 */

export class SwaggerExamples {
  static readonly CREATE_SINGLE_COUPON = {
    summary: 'Create Single Coupon',
    description: 'Example of creating a single coupon with percentage discount',
    value: {
      coupon_type: 'single',
      single_name: 'Summer Sale 2024',
      coupon_code: 'SUMMER2024',
      coupon_title: 'Get 20% Off on All Orders',
      button_title: 'Apply Now',
      description: 'Special summer discount for all customers',
      customer_display: true,
      is_live: true,
      auto_apply: false,
      total_times_uses: 1000,
      start_date: '2024-06-01',
      end_date: '2024-08-31',
      eligibility: [
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
          minimum_purchage: 'minimum_purchase_value',
          minimum_purchage_value: 50,
          limit_per_user: 1,
          customer_eligibility_value: [],
          use_previous_subs_data: false,
        },
      ],
    },
  };

  static readonly CREATE_BULK_COUPON = {
    summary: 'Create Bulk Coupon',
    description: 'Example of creating bulk coupons for a marketing campaign',
    value: {
      coupon_type: 'bulk',
      bulk_name: 'Marketing Campaign Q4',
      agency_name: 'Digital Marketing Agency',
      description: 'Bulk coupon campaign for Q4',
      no_of_coupons: 500,
      need_alphanumeric_code: true,
      auto_apply: false,
      total_times_uses: 0,
      start_date: '2024-10-01',
      end_date: '2024-12-31',
      coupon_pattern: {
        pre_fix: 'Q4MKT',
        serial_number: 1001,
      },
      eligibility: [
        {
          eligibility_type: 'discount',
          type_of_order: 'new',
          diet_type: ['balance', 'low'],
          order_type: [7, 14, 30],
          compulsory_meal: [],
          discount_type: 'percentage',
          percentage_discount_type: 'overall',
          discount_value: 15,
          use_max_discount: true,
          max_discount_value: 75,
          minimum_purchage: 'no_minimum',
          minimum_purchage_value: 0,
          limit_per_user: 1,
          customer_eligibility_value: [],
          use_previous_subs_data: false,
        },
      ],
    },
  };

  static readonly CREATE_FREE_MEALS_COUPON = {
    summary: 'Create Free Meals Coupon',
    description: 'Example of creating a coupon that offers free meals',
    value: {
      coupon_type: 'single',
      single_name: 'Free Breakfast Week',
      coupon_code: 'FREEBREAKFAST',
      coupon_title: 'Get Free Breakfast for 7 Days',
      button_title: 'Claim Offer',
      description: 'Enjoy free breakfast for an entire week',
      customer_display: true,
      is_live: true,
      auto_apply: false,
      total_times_uses: 100,
      start_date: '2024-06-01',
      end_date: '2024-06-30',
      eligibility: [
        {
          eligibility_type: 'discount',
          type_of_order: 'all',
          diet_type: ['all'],
          order_type: [14, 30],
          compulsory_meal: ['1_meal'],
          discount_type: 'free_meals',
          free_meal: [
            {
              free_meal_type: 'breakfast',
              free_meal_days: 7,
            },
          ],
          discount_value: 0,
          use_max_discount: false,
          minimum_purchage: 'minimum_quantity',
          minimum_purchage_value: 14,
          limit_per_user: 1,
          customer_eligibility_value: [],
          use_previous_subs_data: false,
        },
      ],
    },
  };

  static readonly CREATE_SPECIFIC_CUSTOMERS_COUPON = {
    summary: 'Create Coupon for Specific Customers',
    description: 'Example of creating a coupon for specific customer IDs',
    value: {
      coupon_type: 'single',
      single_name: 'VIP Customer Discount',
      coupon_code: 'VIP2024',
      coupon_title: 'Exclusive 30% Off for VIP',
      button_title: 'Apply VIP Discount',
      description: 'Special discount for VIP customers',
      customer_display: false,
      is_live: true,
      auto_apply: false,
      total_times_uses: 50,
      start_date: '2024-06-01',
      end_date: '2024-12-31',
      eligibility: [
        {
          eligibility_type: 'discount',
          type_of_order: 'specific_customers',
          diet_type: ['all'],
          order_type: [7, 14, 30],
          compulsory_meal: [],
          discount_type: 'percentage',
          percentage_discount_type: 'overall',
          discount_value: 30,
          use_max_discount: false,
          minimum_purchage: 'no_minimum',
          minimum_purchage_value: 0,
          limit_per_user: 3,
          customer_eligibility_value: [
            '507f1f77bcf86cd799439011',
            '507f1f77bcf86cd799439012',
            '507f1f77bcf86cd799439013',
          ],
          use_previous_subs_data: false,
        },
      ],
    },
  };

  static readonly CREATE_VALUE_DISCOUNT_COUPON = {
    summary: 'Create Value Discount Coupon',
    description: 'Example of creating a coupon with fixed value discount',
    value: {
      coupon_type: 'single',
      single_name: 'Get 50 AED Off',
      coupon_code: 'SAVE50',
      coupon_title: 'Save 50 AED on Your Order',
      button_title: 'Save Now',
      description: 'Get 50 AED discount on minimum purchase of 200 AED',
      customer_display: true,
      is_live: true,
      auto_apply: false,
      total_times_uses: 200,
      start_date: '2024-06-01',
      end_date: '2024-12-31',
      eligibility: [
        {
          eligibility_type: 'discount',
          type_of_order: 'all',
          diet_type: ['all'],
          order_type: [7, 14, 30],
          compulsory_meal: [],
          discount_type: 'value',
          discount_value: 50,
          use_max_discount: false,
          minimum_purchage: 'minimum_purchase_value',
          minimum_purchage_value: 200,
          limit_per_user: 1,
          customer_eligibility_value: [],
          use_previous_subs_data: false,
        },
      ],
    },
  };

  static readonly UPDATE_SINGLE_COUPON = {
    summary: 'Update Single Coupon',
    description: 'Example of updating a single coupon',
    value: {
      coupon_type: 'single',
      single_name: 'Updated Summer Sale',
      coupon_code: 'SUMMER2024UPDATED',
      coupon_title: 'Get 25% Off on All Orders',
      button_title: 'Apply Now',
      description: 'Extended summer discount',
      customer_display: true,
      is_live: true,
      auto_apply: false,
      total_times_uses: 1500,
      end_date: '2024-09-30',
      eligibility: [
        {
          eligibility_type: 'discount',
          type_of_order: 'all',
          diet_type: ['all'],
          order_type: [7, 14, 30],
          compulsory_meal: [],
          discount_type: 'percentage',
          percentage_discount_type: 'overall',
          discount_value: 25,
          use_max_discount: true,
          max_discount_value: 150,
          minimum_purchage: 'no_minimum',
          minimum_purchage_value: 0,
          limit_per_user: 1,
          customer_eligibility_value: [],
          use_previous_subs_data: false,
        },
      ],
    },
  };

  static readonly UPDATE_BULK_COUPON = {
    summary: 'Update Bulk Coupon',
    description:
      'Example of updating bulk coupon campaign (increasing number of coupons)',
    value: {
      coupon_type: 'bulk',
      bulk_name: 'Marketing Campaign Q4 Extended',
      agency_name: 'Digital Marketing Agency',
      description: 'Extended Q4 campaign with more coupons',
      no_of_coupons: 750,
      need_alphanumeric_code: true,
      auto_apply: false,
      total_times_uses: 0,
      end_date: '2025-01-31',
      coupon_pattern: {
        pre_fix: 'Q4MKT',
        serial_number: 1001,
      },
      eligibility: [
        {
          eligibility_type: 'discount',
          type_of_order: 'new',
          diet_type: ['balance', 'low'],
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
    },
  };
}

export class ErrorResponseDto {
  @ApiProperty({ example: 'Error message' })
  message: string;

  @ApiProperty({ example: false })
  status: boolean;

  @ApiProperty({ example: 'BadRequestException' })
  error: string;

  @ApiProperty({ example: 400 })
  statusCode: number;
}

export class SuccessResponseDto {
  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty()
  data: any;
}
