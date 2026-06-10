import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDataDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ type: String })
  category_name: string;

  @Prop({ type: Number, default: 0 })
  order_number: number;

  @Prop({ type: Boolean, default: false })
  is_vegetarian: boolean;

  @Prop({ type: Boolean })
  is_non_vegetarian: boolean;

  @Prop({ type: Boolean, default: false })
  is_live: boolean;

  @Prop({ type: Boolean })
  is_active: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
