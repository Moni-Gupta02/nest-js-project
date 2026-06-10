import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type RewardDocument = Reward & Document;

@Schema({ timestamps: true })
export class Reward {
  @Prop({ type: Types.ObjectId, ref: 'Customers', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: Number })
  points_earned: number;

  @Prop({ type: Number })
  earned_amount_wallet: number;

  @Prop({ type: String, enum: ['pending', 'completed'] })
  status: string;

  @Prop({ type: Number })
  redeem_points: number;

  @Prop({ type: Number })
  redeem_amount_wallet: number;

  @Prop({ type: String })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Orders' })
  order_id: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  is_credit: boolean;

  @Prop({ type: String })
  loyalty_id: string;

  @Prop({ type: String })
  loyalty_level: string;

  @Prop({ type: String })
  loyalty_benefits: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;

  @Prop({ type: String })
  reward_type: string;

  @Prop({
    type: {
      customer_id: { type: Types.ObjectId, ref: 'Customers' },
    },
  })
  referredBy: { customer_id: Types.ObjectId };

  @Prop([{ type: Types.ObjectId, ref: 'Customers' }])
  referred_users: Types.ObjectId[];

  @Prop({ type: String })
  reward_status: string;

  @Prop({ type: Boolean, default: false })
  offer_applicable: boolean;

  @Prop({ type: String })
  offer_type: string;

  @Prop({ type: String })
  reason: string;

  @Prop({ type: Boolean, default: false })
  is_manual: boolean;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
