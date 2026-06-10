import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Customers' })
  customer_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Addresses' })
  address_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Orders' })
  order_id: Types.ObjectId;

  @Prop({ type: String, enum: ['TRIAL', 'MONTHLY'] })
  plan_type: string;

  @Prop({ type: String })
  delivery_days: string;

  @Prop({ type: String })
  plan_duration_in_days: string;

  @Prop({ type: String })
  tags: string;

  @Prop({ type: Boolean })
  is_vegetarian: boolean;

  @Prop({ type: Boolean })
  is_non_vegetarian: boolean;

  @Prop({ type: [String], default: [] })
  avoid_ingredients: string[];

  @Prop({ type: [String], default: [] })
  avoid_category: string[];

  @Prop({ type: String })
  kcal_range: string;

  @Prop({ type: String })
  kcal: string;

  @Prop({ type: [String] })
  selected_meal: string[];

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
        meal_type: { type: String },
        kcal_range: { type: String },
        kcal: { type: String },
        qty: { type: Number },
        protein_category: { type: String },
        is_veg: { type: Boolean, default: false },
      },
    ],
  })
  selected_meal_type: {
    meal_type: string;
    kcal_range: string;
    kcal: string;
    qty: number;
    protein_category: string;
    is_veg: boolean;
  }[];

  @Prop({ type: Number })
  no_of_meals: number;

  @Prop({ type: Number })
  no_of_breakfast: number;

  @Prop({ type: Number })
  no_of_snacks: number;

  @Prop({ type: Number })
  price: number;

  @Prop({ type: Date })
  delivery_start_date: Date;

  @Prop({ type: Date })
  original_delivery_start_date: Date;

  @Prop({ type: Date })
  end_date: Date;

  @Prop({ type: String })
  slot: string;

  @Prop({ type: [String] })
  instruction: string[];

  @Prop({ type: String })
  delivery_note: string;

  @Prop({ type: Boolean, default: false })
  is_cancle: boolean;

  @Prop({ type: Date })
  cancelAt: Date;

  @Prop({ type: Boolean, default: false })
  auto_renew: boolean;

  @Prop({ type: Object })
  bag_info: {
    name: string;
    price: number;
  };

  @Prop({
    type: [
      {
        key: { type: String },
        address_id: { type: String },
        slot: { type: String },
      },
    ],
  })
  week_address: {
    key: string;
    address_id: string;
    slot: string;
  }[];

  @Prop({ type: Boolean, default: false })
  is_refundable: boolean;

  @Prop({ type: Number })
  price_type: number;

  @Prop([{ type: Number }])
  delivery_total: number[];

  @Prop([{ type: Number }])
  actual_delivery_total: number[];

  @Prop({ type: Boolean, default: false })
  is_flex_plan: boolean;

  @Prop({
    type: String,
    enum: ['normal', 'flexi', 'smart_saver'],
    default: 'normal',
  })
  plan: string;

  @Prop({
    type: [
      {
        day: { type: Number },
        covers_meals_for: [{ type: Number }],
      },
    ],
  })
  delivery_schedule: {
    day: number;
    covers_meals_for: number[];
  }[];
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
