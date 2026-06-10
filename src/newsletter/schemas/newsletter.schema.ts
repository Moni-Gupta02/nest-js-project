import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Newsletter extends Document {
  @Prop()
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Customers', required: true })
  customer_id: Types.ObjectId;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);
