import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  LEAD_STAGE_CODES,
  MQL_SUB_STAGE_CODES,
} from '../constants/lead-funnel.constants';

export type LeadStageHistoryDocument = LeadStageHistory & Document;

@Schema({ timestamps: true })
export class LeadStageHistory {
  @Prop({ type: Types.ObjectId, ref: 'Cart', required: true })
  cart_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  customer_id: string;

  @Prop({
    type: String,
    enum: LEAD_STAGE_CODES,
    required: false,
  })
  from_stage: string;

  @Prop({
    type: String,
    enum: LEAD_STAGE_CODES,
    required: true,
  })
  to_stage: string;

  @Prop({
    type: String,
    enum: MQL_SUB_STAGE_CODES,
    required: false,
  })
  sub_stage?: string;

  @Prop({ type: String, required: false })
  note?: string;

  @Prop({ type: String, default: 'phone_lead' })
  source: string;

  @Prop({ type: Object, default: {} })
  changed_by: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  changed_at: Date;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  order_id?: Types.ObjectId;
}

export const LeadStageHistorySchema =
  SchemaFactory.createForClass(LeadStageHistory);
