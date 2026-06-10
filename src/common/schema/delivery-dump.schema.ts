import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DeliveryDumpDocument = DeliveryDump & Document;

@Schema({ timestamps: true, collection: 'delivery_dump' })
export class DeliveryDump {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'customer',
    required: true,
  })
  customer_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'order', required: true })
  order_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'subscription' })
  subscription_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'address', required: true })
  address_id: MongooseSchema.Types.ObjectId;

  @Prop({ type: String })
  delivery_type: string;

  @Prop({ type: [Object] })
  delivery_item: object[];

  @Prop({ type: Object })
  lunch: object;

  @Prop({ type: Object })
  dinner: object;

  @Prop({ type: Object })
  breakfast: object;

  @Prop({ type: Object })
  morning_snack: object;

  @Prop({ type: Object })
  evening_snack: object;

  @Prop({ type: Array })
  selected_meal: string[];

  @Prop({ type: String })
  protein_category: string;

  @Prop({ type: [Object] })
  selected_meal_type: object[];

  @Prop({ type: Date })
  delivery_date: Date;

  @Prop({ type: String })
  slot: string;

  @Prop({ type: String, enum: ['Pending', 'Delivered'], default: 'Pending' })
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

  @Prop({ type: String })
  supervisor_lodding: string;

  @Prop({ type: Date })
  scanning_time_loading: Date;

  @Prop({ type: Boolean, default: false })
  is_ready_for_lodding: boolean;

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
}

export const DeliveryDumpSchema = SchemaFactory.createForClass(DeliveryDump);
