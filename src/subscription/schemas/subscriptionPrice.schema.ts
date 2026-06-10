import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPriceDocument = SubscriptionPrice & Document;

@Schema({ timestamps: true })
export class SubscriptionPrice {
  @Prop()
  number_of_meal: string;

  @Prop()
  meal_type: string;

  @Prop()
  meal_tag: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: 0 })
  price_type: number;

  @Prop({ default: 0 })
  refundable_deposite: number;

  @Prop({ default: false })
  is_mandatory: boolean;

  @Prop({ default: 0 })
  box_deposite_monthly: number;

  @Prop({ default: 0 })
  box_deposite_trial: number;

  @Prop()
  day_1: number;

  @Prop()
  day_5: number;

  @Prop()
  day_6: number;

  @Prop()
  day_10: number;

  @Prop()
  day_12: number;

  @Prop()
  day_20: number;

  @Prop()
  day_24: number;

  @Prop()
  day_40: number;

  @Prop()
  day_48: number;

  @Prop()
  day_60: number;

  @Prop()
  day_72: number;

  @Prop()
  discount: number;

  @Prop()
  protein_category: string;
}

export const SubscriptionPriceSchema =
  SchemaFactory.createForClass(SubscriptionPrice);
