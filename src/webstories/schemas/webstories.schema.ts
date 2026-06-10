// entities/web-story.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type WebStoriesDocument = WebStories & Document;

@Schema({ timestamps: true })
export class WebStories {
  @Prop({ unique: true })
  title: string;

  @Prop([String])
  category: string[];

  @Prop()
  description: string;

  @Prop()
  thumbnail_image: string;

  @Prop()
  slug: string;

  @Prop()
  section: string;

  @Prop([
    {
      _id: String,
      content_image: String,
      content_title: String,
      content_description: String,
      cta_button_title: String,
      button_link: String,
    },
  ])
  content: Array<{
    _id: string;
    content_image: string;
    content_title: string;
    content_description: string;
    cta_button_title: string;
    button_link: string;
  }>;
}

export const WebStoriesSchema = SchemaFactory.createForClass(WebStories);
