// content.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentDocument = Content & Document;

export enum ContentType {
  PRIVACY_POLICY = 'privacy-policy',
  ABOUT_US = 'about-us',
  CONTACT_US = 'contact-us',
  TERMS_CONDITIONS = 'terms-conditions',
  FAQ = 'faq',
  HELP = 'help',
}

@Schema({ timestamps: true })
export class Content {
  @Prop({ required: true, enum: ContentType })
  type: ContentType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  sub_content: string;

  @Prop({ required: true })
  version: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ContentSchema = SchemaFactory.createForClass(Content);

// Add compound index for type and isActive
ContentSchema.index({ type: 1, isActive: 1 });
ContentSchema.index({ type: 1, version: 1 });
