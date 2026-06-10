export class Translation {}
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Translate extends Document {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  data: string;

  @Prop()
  description?: string;

  @Prop({ required: false, default: 'en' })
  language: string;

  @Prop({ required: false })
  is_not_translation_data: boolean;
}

export const TranslateSchema = SchemaFactory.createForClass(Translate);
