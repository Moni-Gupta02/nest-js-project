// notification-history.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, Document, Types } from 'mongoose';
export type RecipeRatingDocument = RecipeRating & Document;

@Schema({ timestamps: true })
export class RecipeRating {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Recipes_Detail' }) // Change type to String
  recipe_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deliveries' }) // Change type to String
  delivery_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' }) // Change type to String
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Subscription' }) // Change type to String
  subscription_id: Types.ObjectId;

  @Prop({ type: String })
  delivery_type: string;

  @Prop({ type: Date }) // Change type to String
  delivery_date: Date;

  @Prop({ type: Number })
  rating: number;

  @Prop({ type: String })
  comment: string;

  @Prop({ type: Array, default: [] })
  review: any[];
}

export const RecipeRatingSchema = SchemaFactory.createForClass(RecipeRating);
