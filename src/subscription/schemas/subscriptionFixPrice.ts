import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionFixPriceDocument = SubscriptionFixPrice & Document;

@Schema({ timestamps: true })
export class SubscriptionFixPrice {
  @Prop({ default: 'subscription_fix_price' })
  name: string;

  @Prop()
  breakfast: string;

  @Prop()
  evening_snack: string;

  @Prop()
  morning_snack: string;

  @Prop({ type: [String] })
  upselling_offers: string[];
}

export const SubscriptionFixPriceSchema =
  SchemaFactory.createForClass(SubscriptionFixPrice);
