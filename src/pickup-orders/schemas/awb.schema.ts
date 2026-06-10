import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AWBDocument = AWB & Document;

class Details {
  @Prop()
  customer_id: string;

  @Prop()
  order_number: string;

  @Prop()
  customer_code: string;

  @Prop()
  subscription_id: string;

  @Prop()
  bag_code: string;

  @Prop()
  sent_bag_count: number;
}

@Schema({ timestamps: true })
export class AWB {
  @Prop()
  awb: string;

  @Prop({ type: [Details] })
  details: Details[];

  @Prop({ type: Object })
  refund_bag_details: Record<string, any>;

  @Prop({ enum: ['bag_pick', 'ndd', 'mp'] })
  type: string;

  @Prop({ type: Date })
  transcorp_date: Date;

  @Prop()
  received_bag_count: number;

  @Prop()
  delivery_details: string;

  @Prop()
  kitchen_bag_count: number;

  @Prop()
  active: boolean;

  @Prop({ default: false })
  is_finalized: boolean;

  @Prop({ default: false })
  is_drived_finalized: boolean;

  @Prop()
  vendor: string;

  @Prop()
  status: string;
}

export const AWBSchema = SchemaFactory.createForClass(AWB);
