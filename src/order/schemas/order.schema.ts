import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Number, required: true })
  order_number: number;

  @Prop({ type: Number })
  migrated_order_number: number;

  @Prop({ type: Types.ObjectId, ref: 'Customers', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Addresss' })
  address_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscriptions' })
  subscription_id: Types.ObjectId;

  @Prop({ type: String })
  order_type: string;

  @Prop({ type: String, enum: ['new', 're-new'] })
  type_of_order: string;

  @Prop({ type: Object })
  order_item: object;

  @Prop({ type: Number })
  order_total: number;

  @Prop({ type: Number, default: 0 })
  refundable_deposite: number;

  @Prop({ type: Number })
  discount: number;

  @Prop({ type: Number })
  discount_percent: number;

  @Prop({ type: String })
  discount_type: string;

  @Prop({ type: String })
  discount_eligibility_type?: string;

  @Prop({
    type: [
      {
        free_meal_type: {
          type: String,
          enum: [
            'lunch',
            'dinner',
            'breakfast',
            'morning_snack',
            'evening_snack',
          ],
          required: false,
        },
        free_meal_days: {
          type: Number,
          required: false,
        },
      },
    ],
    required: false,
  })
  free_meal?: {
    free_meal_type?: string;
    free_meal_days?: number;
  }[];

  @Prop({
    type: [
      {
        discount: { type: Number },
        discount_percent: { type: Number },
        discount_type: { type: String },
        discount_name: { type: String },
      },
    ],
  })
  addon_discount: {
    discount: number;
    discount_percent: number;
    discount_type: string;
    discount_name: string;
  }[];

  @Prop({ type: Number })
  additional_discount: number;

  @Prop({ type: String })
  additional_discount_type: string;

  @Prop({ type: String })
  reward_type: string;

  @Prop({ type: Number })
  reward_value: number;

  @Prop({ type: Number })
  reward_aed: number;

  @Prop({ type: Types.ObjectId, ref: 'Rewards' })
  reward_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Rewards' })
  referral_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Rewards' })
  redeem_id: Types.ObjectId;

  @Prop({ type: Number })
  reward_wallet: number;

  @Prop({ type: Number })
  usable_reward_wallet: number;

  @Prop({ type: Number })
  redeem_amount_wallet: number;

  @Prop({ type: Boolean, default: false })
  is_used_reward_wallet: boolean;

  @Prop({ type: Number })
  referral_discount: number;

  @Prop({ type: Number, default: 0 })
  box_deposite: number;

  @Prop({ type: Number })
  order_subtotal: number;

  @Prop({ type: Number })
  order_vat: number;

  @Prop({ type: Number })
  order_vat_value: number;

  @Prop({ type: Number })
  shipping_charge: number;

  @Prop({ type: Number })
  final_order_total: number;

  @Prop({ type: Number })
  qty_count: number;

  @Prop({ type: String })
  delivery_note: string;

  @Prop({ type: String })
  slot: string;

  @Prop({ type: Date })
  delivery_start_date: Date;

  @Prop({ type: [String] })
  instruction: string[];

  @Prop({ type: Types.ObjectId, ref: 'Coupons' })
  coupon_id: Types.ObjectId;

  @Prop({ type: Object })
  billing_address_data: object;

  @Prop({ type: String })
  order_ref: string;

  @Prop({ type: String })
  tran_ref: string;

  @Prop({
    type: String,
    default: 'Ongoing',
    enum: [
      'Completed',
      'Ongoing',
      'Failed',
      'Partially_Cancelled',
      'Cancelled',
    ],
  })
  order_status: string;

  @Prop({ type: Date })
  order_generation_time: Date;

  @Prop({ type: String })
  third_party_status: string;

  @Prop({ type: String })
  financial_status: string;

  @Prop({ type: String, default: '' })
  internal_notes: string;

  @Prop({ type: String, default: 'AED' })
  currency: string;

  @Prop({ type: [String], default: ['tap'] })
  payment_gateway_names: string[];

  @Prop({ type: String })
  invoice_path: string;

  @Prop({ type: Date })
  cancelAt: Date;

  @Prop({ type: String })
  cancelled_by_name: string;

  @Prop({ type: String })
  cancelled_by_email: string;

  @Prop({ type: String })
  reason: string;

  @Prop({ type: Number })
  refund: number;

  @Prop({ type: String })
  details: string;

  @Prop({ type: [Object] })
  cancellation_details: object[];

  @Prop({ type: Boolean, default: false })
  welcome_back: boolean;

  @Prop({ type: Number })
  price_type: number;

  @Prop({ type: Boolean, default: null })
  order_is_corporate: boolean;

  @Prop({ type: String, default: null })
  apply_refund_deposite: string;

  @Prop({ type: Boolean, default: false })
  offer_applicable?: boolean;

  @Prop({ type: String })
  offer_type?: string;

  @Prop({ type: Number })
  offer_click_count?: number;

  @Prop({ type: String })
  order_goal?: string;

  @Prop({ type: String })
  payment_method?: string;

  @Prop({ type: Boolean, default: false })
  is_flex_plan: boolean;

  @Prop({
    type: String,
    enum: ['normal', 'flexi', 'smart_saver'],
    default: 'normal',
  })
  plan: string;

  @Prop({
    type: {
      device_type: { type: String },
      platform: { type: String },
      isMobileApp: { type: Boolean },
      isMobile: { type: Boolean },
      browser: { type: String },
      os: { type: String },
      device: { type: String },
    },
    required: false,
  })
  client_info?: {
    device_type?: string;
    platform?: string;
    isMobileApp?: boolean;
    isMobile?: boolean;
    browser?: string;
    os?: string;
    device?: string;
  };
}

export const OrderSchema = SchemaFactory.createForClass(Order);
