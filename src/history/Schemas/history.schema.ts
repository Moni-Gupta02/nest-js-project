import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, Document, Schema as MongooseSchema } from 'mongoose';

export type HistoryDocument = History &
  Document & {
    createdAt: Date;
    updatedAt: Date;
  };
@Schema({ timestamps: true })
export class History {
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

  @Prop({ required: false })
  entity_id: string; // Keeping entity_id as it was in original schema and might be useful
}

export const HistorySchema = SchemaFactory.createForClass(History);
