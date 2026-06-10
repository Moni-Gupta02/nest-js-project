import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class FAQ extends Document {
  // @Prop({ type: [String] })
  // category: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'faq_categories' }] }) // Reference FAQCategory
  category: Types.ObjectId[]; // Changed from string[] to ObjectId[]

  @Prop()
  question: string;

  @Prop()
  answer: string;

  @Prop()
  order_index: string;
}

export const FAQSchema = SchemaFactory.createForClass(FAQ);
