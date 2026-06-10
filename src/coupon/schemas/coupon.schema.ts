import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CouponDocument = Coupon & Document;

@Schema({ timestamps: true })
export class Coupon {
  @Prop()
  name: string;

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

  @Prop()
  description: string;

  @Prop()
  button_title: string;

  @Prop()
  need_alphanumeric_code: boolean;

  @Prop({
    type: [
      {
        type_of_order: {
          type: String,
          enum: ['all', 'new', 're-new', 'specific_customers'],
          required: true,
        },
        order_type: {
          type: String,
          enum: ['all', 'TRIAL', 'NDD', 'MONTHLY'],
          required: true,
        },
        discount_type: {
          type: String,
          enum: ['percentage', 'value'],
          required: true,
        },
        discount_value: { type: Number, required: true },
        use_max_discount: { type: Boolean, default: false },
        customer_eligibility_value: { type: Array },
        max_discount_value: { type: Number },
        minimum_purchage: {
          type: String,
          enum: ['no_minimum', 'minimum_purchase_value', 'minimum_quantity'],
          required: true,
        },
        minimum_purchage_value: { type: Number, default: 0 },
        limit_per_user: { type: Number, default: 0 },
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

  @Prop()
  company: string;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
