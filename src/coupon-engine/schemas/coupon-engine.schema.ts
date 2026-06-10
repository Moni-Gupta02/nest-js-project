import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export interface LanguageStrings {
  [key: string]: string;
}

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop()
  name: string;

  @Prop({ type: Object, required: false })
  name_tl?: LanguageStrings;

  @Prop({ default: false })
  auto_apply: boolean;

  @Prop()
  agency_name: string;

  @Prop()
  no_of_coupons: number;

  @Prop({ type: Object })
  coupon_pattern: {
    pre_fix: string;
    random: string;
    serial_number: number;
  };

  @Prop({ required: true, enum: ['single', 'bulk'] })
  coupon_type: string;

  @Prop()
  coupon_code: string;

  @Prop()
  coupon_title: string;

  @Prop({ type: Object, required: false })
  coupon_title_tl?: LanguageStrings;

  @Prop()
  company: string;

  @Prop()
  description: string;

  @Prop({ type: Object, required: false })
  description_tl?: LanguageStrings;

  @Prop()
  button_title: string;

  @Prop()
  need_alphanumeric_code: boolean;

  @Prop({
    type: [
      {
        eligibility_type: {
          type: String,
          enum: ['discount', 'cashback'],
          required: true,
        },
        type_of_order: {
          type: String,
          enum: ['all', 'new', 're-new', 'specific_customers'],
          required: true,
        },
        diet_type: {
          type: [String],
          required: true,
        },
        order_type: {
          type: [],
          required: true,
        },
        compulsory_meal: {
          type: [String],
          default: [],
        },
        discount_type: {
          type: String,
          enum: ['percentage', 'value', 'free_meals', 'free_days'],
          required: true,
        },
        percentage_discount_type: { type: String },
        free_meal: {
          type: [
            {
              free_meal_type: {
                type: String,
                enum: [
                  '1_meal',
                  '2_meal',
                  'breakfast',
                  '1_snack',
                  '2_snack',
                  'morning_snack',
                  'evening_snack',
                ],
              },
              free_meal_days: { type: Number },
            },
          ],
        },
        percent_meal: {
          type: [
            {
              meal: {
                type: String,
                enum: [
                  '1_meal',
                  '2_meal',
                  'breakfast',
                  '1_snack',
                  '2_snack',
                  'morning_snack',
                  'evening_snack',
                ],
              },
              discount: { type: Number },
            },
          ],
        },
        discount_value: { type: Number, required: true },
        use_max_discount: { type: Boolean, default: false },
        max_discount_value: { type: Number },
        minimum_purchage: {
          type: String,
          enum: ['no_minimum', 'minimum_purchase_value', 'minimum_quantity'],
          required: true,
        },
        minimum_purchage_value: { type: Number, default: 0 },
        limit_per_user: { type: Number, default: 1 },
        customer_eligibility_value: { type: [String], default: [] },
        use_previous_subs_data: { type: Boolean, default: false },
        previous_subscription_data: {
          type: {
            last_delivery_date: { type: Date },
            last_delivery_day: { type: Number },
            plan_duration_in_days: { type: [Number] },
            selected_meal: { type: [String] },
            diet_type: { type: [String] },
          },
        },
      },
    ],
  })
  eligibility: Record<string, any>[];

  @Prop()
  total_times_uses: number;

  @Prop({
    type: [{ customer_id: String, no_of_times: Number }],
  })
  no_of_users: { customer_id: string; no_of_times: number }[];

  @Prop()
  start_date: Date;

  @Prop()
  end_date: Date;

  @Prop()
  is_live: boolean;

  @Prop({ default: false })
  customer_display: boolean;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
