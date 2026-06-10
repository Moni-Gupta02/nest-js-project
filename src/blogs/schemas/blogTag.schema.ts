import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BlogTag extends Document {
  @Prop()
  tag: string;
}

export const BlogTagSchema = SchemaFactory.createForClass(BlogTag);
