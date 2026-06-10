import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FAQCategory extends Document {
  @Prop()
  name: string;
}

export const FAQCategorySchema = SchemaFactory.createForClass(FAQCategory);
