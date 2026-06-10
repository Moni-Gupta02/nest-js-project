import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class LanguageTranslation {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  targetLanguage: string;

  @Prop({ default: null })
  translatedText: string | null;
}

export type LanguageTranslationDocument = LanguageTranslation & Document;

export const LanguageTranslationSchema =
  SchemaFactory.createForClass(LanguageTranslation);
