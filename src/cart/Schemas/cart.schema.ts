import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CartDocument = Cart & Document;
@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: String })
  customer_id: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  unique_id: Types.ObjectId;

  @Prop({ type: Object })
  address_data: Record<string, any>;

  @Prop({ type: Object })
  billing_address_data: Record<string, any>;

  @Prop({ type: String, enum: ['guest', 'customer'], default: 'guest' })
  customer_type: string;

  @Prop({ type: String, enum: ['NDD', 'subscription'] })
  cart_type: string;

  @Prop({ type: Date })
  cart_date: Date;

  @Prop({ type: Object })
  cart_item: Record<string, any>;

  @Prop({ type: Number })
  cart_total: number;

  @Prop({ type: Number })
  discount: number;

  @Prop({ type: Number })
  discount_percent: number;

  @Prop({ type: String })
  discount_type: string;

  @Prop([
    {
      discount: { type: Number },
      discount_percent: { type: Number },
      discount_type: { type: String },
      offer_type: { type: String },
      discount_name: { type: String },
    },
  ])
  addon_discount: Array<Record<string, any>>;

  @Prop({ type: Number })
  additional_discount: number;

  @Prop({ type: String })
  additional_discount_type: string;

  @Prop({ type: Number })
  combo_discount: number;

  @Prop({ type: Number })
  cart_subtotal: number;

  @Prop({ type: Number })
  cart_vat: number;

  @Prop({ type: Number })
  cart_vat_value: number;

  @Prop({ type: Number })
  final_total: number;

  @Prop({ type: Number })
  shipping_charge: number;

  @Prop({ type: Number })
  qty_count: number;

  @Prop({ type: Types.ObjectId, ref: 'Coupon' })
  coupon_id: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  refundable_deposite: number;

  @Prop({ type: Number, default: 0 })
  box_deposite: number;

  @Prop({ type: String })
  delivery_note: string;

  @Prop({ type: String })
  slot: string;

  @Prop({ type: Date })
  delivery_start_date: Date;

  @Prop([{ type: String }])
  instruction: string[];

  @Prop({ type: String })
  cart_status: string;

  @Prop({ type: String })
  same_as_delivery: string;

  @Prop({ type: Boolean })
  is_renew: boolean;

  @Prop({ type: String, enum: ['reward', 'discount'] })
  reward_type: string;

  @Prop({ type: Number })
  reward_value: number;

  @Prop({ type: Number })
  reward_aed: number;

  @Prop({ type: Number })
  reward_wallet: number;

  @Prop({ type: Number })
  usable_reward_wallet: number;

  @Prop({ type: Number, default: 0 })
  redeem_amount_wallet: number;

  @Prop({ type: Boolean, default: false })
  is_used_reward_wallet: boolean;

  @Prop({ type: Number })
  referral_discount: number;

  @Prop({ type: String, default: null })
  apply_refund_deposite: string;

  @Prop({ type: Number, default: 0 })
  price_type: number;

  @Prop({ type: Date })
  otp_expire_in: Date;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: Boolean, default: null })
  cart_is_corporate: boolean;

  @Prop({ type: Boolean, default: false })
  offer_applicable: boolean;

  @Prop({ type: String })
  offer_type: string;

  @Prop({ type: String })
  type_of_cart: string;

  @Prop({ type: Boolean, default: false })
  is_flex_plan: boolean;

  @Prop({
    type: String,
    enum: ['normal', 'flexi', 'smart_saver'],
    default: 'normal',
  })
  plan: string;

  @Prop({
    type: String,
    enum: ['RNR', 'DQL', 'MQL', 'SQL', 'CONVERTED'],
    required: false,
  })
  lead_stage_code?: string;

  @Prop({ type: String, required: false })
  lead_stage_label?: string;

  @Prop({ type: Date, required: false })
  lead_stage_updated_at?: Date;

  @Prop({
    type: String,
    enum: ['CALL_AFTER_1_DAY', 'CALL_AFTER_2_DAY', 'CX_TEAM_ACTION'],
    required: false,
  })
  sub_stage?: string;

  @Prop({ type: String, required: false })
  sub_stage_label?: string;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
