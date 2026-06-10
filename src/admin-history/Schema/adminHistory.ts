import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminHistoryDocument = AdminHistory & Document;

@Schema({ timestamps: true })
export class AdminHistory {
  @Prop({ type: String, enum: ['admin', 'customer', 'rms'], default: 'admin' })
  platform: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: Object })
  before_change: Record<string, any>;

  @Prop({ type: Object })
  after_change: Record<string, any>;

  @Prop({
    type: Object,
    required: true,
    _id: false,
    properties: {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
  })
  changed_by: {
    name: string;
    email: string;
  };

  @Prop({ type: Object })
  change_details: Record<string, any>;
}

export const AdminHistorySchema = SchemaFactory.createForClass(AdminHistory);
