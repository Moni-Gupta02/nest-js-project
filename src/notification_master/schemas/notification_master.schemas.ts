// notification-master.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type NotificationMasterDocument = NotificationMaster & Document;

@Schema({ timestamps: true })
export class NotificationMaster {
  @Prop({ type: String })
  type_of_notification: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: Boolean, default: false })
  is_sms: boolean;

  @Prop({ type: Boolean, default: false })
  is_whatsapp: boolean;

  @Prop({ type: Boolean, default: false })
  is_email: boolean;

  @Prop({ type: Boolean, default: false })
  is_slack: boolean;

  @Prop({ type: Boolean, default: false })
  is_push_notification: boolean;

  @Prop({ type: String })
  sms_template: string;

  @Prop({ type: String })
  email_template: string;

  @Prop({ type: String })
  whatsapp_template: string;

  @Prop({ type: String })
  slack_template: string;

  @Prop({ type: String })
  push_notification_template: string;
}

export const NotificationMasterSchema =
  SchemaFactory.createForClass(NotificationMaster);
