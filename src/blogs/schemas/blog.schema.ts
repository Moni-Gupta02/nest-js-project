import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop()
  category: string;

  @Prop({ type: [String] })
  tag: string[];

  @Prop()
  author_name: string;

  @Prop({ type: Types.ObjectId, ref: 'Author' })
  author_id: Types.ObjectId;

  @Prop()
  title: string;

  @Prop()
  subtitle: string;

  @Prop()
  cover_image: string;

  @Prop()
  meta_title: string;

  @Prop()
  meta_description: string;

  @Prop()
  meta_image_alt_text: string;

  @Prop()
  thumbnail_image: string;

  @Prop()
  banner_image: string;

  @Prop()
  min_reading_time: string;

  @Prop()
  publishing_date: string;

  @Prop()
  content: string;

  @Prop({
    type: {
      title: String,
      description: String,
      cta_button_title: String,
      cta_button_link: String,
    },
  })
  banner_top: {
    title: string;
    description: string;
    cta_button_title: string;
    cta_button_link: string;
  };

  @Prop({
    type: {
      title: String,
      description: String,
      cta_button_title: String,
      cta_button_link: String,
    },
  })
  banner_last: {
    title: string;
    description: string;
    cta_button_title: string;
    cta_button_link: string;
  };

  @Prop()
  slug: string;

  @Prop({
    type: [
      {
        question: String,
        answer: String,
      },
    ],
  })
  faq: Array<{ question: string; answer: string }>;

  @Prop({ type: [String] })
  meta_script: string[];
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
