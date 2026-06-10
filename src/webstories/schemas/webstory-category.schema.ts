import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class WebStoriesCategory {
  @Prop({ required: true })
  category: string;
}

export type WebStoriesCategoryDocument = WebStoriesCategory & Document;
export const WebStoriesCategorySchema =
  SchemaFactory.createForClass(WebStoriesCategory);
