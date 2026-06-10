import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeliveryDocument = Delivery & Document;

@Schema({ timestamps: true })
export class Delivery {
  @Prop({ type: Types.ObjectId, ref: 'Customers', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Orders', required: true })
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscriptions' })
  subscription_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Addresses', required: true })
  address_id: Types.ObjectId;

  @Prop({ type: String })
  delivery_type: string;

  @Prop({ type: [{ type: Object }] })
  delivery_item: Record<string, any>[];

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

  @Prop({ type: Date })
  delivery_date: Date;

  @Prop({ type: String })
  slot: string;

  @Prop({ type: String, default: 'Pending', enum: ['Pending', 'Delivered'] })
  status: string;

  @Prop({ type: String })
  delivery_note: string;

  @Prop({ type: [String] })
  instruction: string[];

  @Prop({ type: Boolean, default: true })
  not_deliverable: boolean;

  @Prop({ type: Boolean, default: false })
  is_delivery_freezed: boolean;

  @Prop({ type: Boolean, default: false })
  is_extended: boolean;

  @Prop({ type: Number })
  whole_delivery_rating: number;

  @Prop({ type: String })
  customer_internal_code: string;

  @Prop({ type: Boolean, default: false })
  is_customer_ready: boolean;

  @Prop({ type: Boolean, default: false })
  is_customer_ready_for_pacakaging: boolean;

  @Prop({ type: Boolean, default: false })
  is_packed_for_delivery: boolean;

  @Prop({ type: Boolean, default: false })
  is_ready_for_dispatch: boolean;

  @Prop({ type: Date })
  scanning_time_loading?: Date;

  @Prop({ type: String })
  supervisor_lodding?: string;

  @Prop({ type: Boolean, default: false })
  is_ready_for_lodding?: boolean;

  @Prop({ type: Boolean, default: false })
  is_processed: boolean;

  @Prop({ type: String })
  bag_code: string;

  @Prop({ type: String })
  supervisor_packing: string;

  @Prop({ type: Date })
  scanning_time_packing: Date;

  @Prop({ type: String })
  scanning_person: string;

  @Prop({ type: Boolean, default: false })
  is_barcode_finalized: boolean;

  @Prop({ type: String, default: 'pending' })
  dispatch_scanning: string;

  @Prop({ type: Boolean, default: false })
  dispatch_pending: boolean;

  @Prop({ type: String })
  awb: string;

  @Prop({ type: Boolean })
  subscription_extend: boolean;

  @Prop({ type: Boolean, default: false })
  menu_live: boolean;

  @Prop({ type: Boolean, default: false })
  extra_delivery: boolean;

  @Prop({ type: Boolean, default: false })
  is_flex_plan: boolean;

  @Prop({
    type: String,
    enum: ['normal', 'flexi', 'smart_saver'],
    default: 'normal',
  })
  plan: string;
}


export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.index({
  delivery_date: 1,
});