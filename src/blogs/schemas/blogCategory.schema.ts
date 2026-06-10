import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BlogCategory extends Document {
  @Prop()
  category: string;
}

export const BlogCategorySchema = SchemaFactory.createForClass(BlogCategory);
