import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MasterDocument = Master & Document;

@Schema({ timestamps: true, collection: 'masterdatas' })
export class Master {
  @Prop({ type: String, default: 'master_data' })
  name: string;

  @Prop({ type: Number, default: 1 })
  reward_point: number;

  @Prop({ type: Number, default: 1 })
  reward_aed: number;

  @Prop({ type: Number, default: 1 })
  new_order_reward_aed: number;

  @Prop({ type: Number })
  minimum_allowed_reward: number;

  @Prop({ type: Number, default: 0 })
  refundable_deposite: number;

  @Prop({ type: Number, default: 10000 })
  renew_monthly_delivery_limit: number;

  @Prop({ type: Number, default: 10000 })
  renew_weekly_delivery_limit: number;

  @Prop({ type: Number, default: 10000 })
  new_monthly_delivery_limit: number;

  @Prop({ type: Number, default: 10000 })
  new_weekly_delivery_limit: number;

  @Prop([
    {
      id: { type: String },
      name: { type: String },
      image: { type: String },
    },
  ])
  instruction: Array<{ id: string; name: string; image: string }>;
}

export const masterSchema = SchemaFactory.createForClass(Master);
