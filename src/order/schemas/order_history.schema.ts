import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderHistoryDocument = OrderHistory & Document;

@Schema({ timestamps: true, collection: 'orderhistories' })
export class OrderHistory {
  @Prop({ type: Types.ObjectId, ref: 'customer', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'order', required: true })
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'subscription' })
  subscription_id: Types.ObjectId;

  @Prop({ type: Boolean, required: true })
  is_credit: boolean;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number })
  card_last_four_digit: number;

  @Prop({ type: String })
  card_type: string;

  @Prop({ type: String, required: true })
  payment_type: string;

  @Prop({ type: String, required: true })
  payment_status: string;

  @Prop({ type: Object })
  details: object;
}

export const OrderHistorySchema = SchemaFactory.createForClass(OrderHistory);
