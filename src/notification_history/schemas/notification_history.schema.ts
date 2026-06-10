// notification-history.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type NotificationHistoryDocument = NotificationHistory & Document;

@Schema({ timestamps: true })
export class NotificationHistory {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: String })
  phone_number: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' })
  subscription_id: Types.ObjectId;

  @Prop({ type: Date })
  date: Date;

  @Prop({ type: String })
  notification_type: string;

  @Prop({ type: Types.ObjectId, ref: 'NotificationMaster' })
  notification_id: Types.ObjectId;

  @Prop({ type: String })
  type_of_notification_master: string;

  @Prop({ type: String })
  notification_title: string;

  @Prop({
    type: String,
    enum: ['Pending', 'Delivered', 'Read', 'Failed'],
    default: 'Pending',
  })
  status: string;

  @Prop({ type: String })
  error: string;

  @Prop({ type: String })
  message_id: string;

  @Prop({ type: String })
  status_url: string;
}

export const NotificationHistorySchema =
  SchemaFactory.createForClass(NotificationHistory);
