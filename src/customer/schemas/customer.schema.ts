import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema()
class ReferredBy {
  @Prop({ type: Types.ObjectId, ref: 'Customers' })
  customer_id: Types.ObjectId;

  @Prop({ type: String })
  referral_code: string;

  @Prop({ type: Boolean })
  is_used: boolean;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: String })
  first_name: string;

  @Prop({ type: String })
  last_name: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  address_type: string;

  @Prop({ type: String })
  full_address: string;

  @Prop({ type: String })
  customer_type: string;

  @Prop({ type: String })
  city: string;

  @Prop({ type: String })
  province: string;

  @Prop({ type: String })
  province_code: string;

  @Prop({ type: String, default: 'United Arab Emirates' })
  country: string;

  @Prop({ type: Number })
  latitude: number;

  @Prop({ type: Number })
  longitude: number;

  @Prop({ type: String })
  billing_address1: string;

  @Prop({ type: String })
  country_code: string;

  @Prop({ type: String })
  phone_number: string;

  @Prop({ type: String })
  whatsapp_country_code: string;

  @Prop({ type: String })
  whatsapp_number: string;

  @Prop({ type: String })
  otp: string;

  @Prop({ type: Date })
  otp_expire_in: Date;

  @Prop({ type: Boolean, default: false })
  is_verified: boolean;

  @Prop({ type: String })
  user_register_flag: string;

  @Prop({ type: Number, default: 0 })
  total_spent: number;

  @Prop({ type: Number, default: 0 })
  total_orders: number;

  @Prop({ type: Number, default: 0 })
  shopify_total_spent: number;

  @Prop({ type: Number, default: 0 })
  shopify_total_orders: number;

  @Prop({ type: Number, default: 0 })
  total_ndd_order: number;

  @Prop({ type: Number, default: 0 })
  total_subscription_order: number;

  @Prop({ type: [{ type: Object }], default: [] })
  fcm_token: [];

  @Prop({ type: Boolean })
  is_migrated: boolean;

  @Prop({ type: [{ type: Object }], default: [] })
  internal_notes: [];

  @Prop({ type: [String] })
  bag: string[];

  @Prop({ type: Number, default: 0 })
  bag_count: number;

  @Prop({ type: Date })
  birthday: Date;

  @Prop({ type: ReferredBy })
  referredBy: ReferredBy;

  @Prop([{ type: Types.ObjectId, ref: 'Customer' }])
  referred_users: Types.ObjectId[];

  @Prop({ type: String })
  referral_code: string;

  @Prop({ type: String })
  referral_link: string;

  @Prop({ type: Number, default: 0 })
  reward_wallet: number;

  @Prop({ type: Number, default: 0 })
  reward_amount_wallet: number;

  @Prop([
    {
      offer_reward_wallet: { type: Number },
      offer_reward_amount_wallet: { type: Number },
      offer_price: { type: Number },
    },
  ])
  offer_reward: Record<string, any>[];

  @Prop({ type: String, default: 'level_1' })
  loyalty_level: string;

  @Prop({ type: Number })
  price_type: number;

  @Prop({ type: String })
  source: string;

  @Prop({
    type: {
      preferred_channels: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: true },
        whatsapp: { type: Boolean, default: true },
        push_notification: { type: Boolean, default: true },
      },
    },
  })
  notification_preferences: {
    preferred_channels: {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
      push_notification: boolean;
    };
  };
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
