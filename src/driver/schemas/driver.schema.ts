import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeliverySlotDocument = DeliverySlot & Document;

@Schema({ timestamps: true })
export class DeliverySlot {
  @Prop({ type: String })
  city_name: string;

  @Prop({
    type: [
      {
        timing: { type: String },
      },
    ],
  })
  slot_list: Array<{ timing: string }>;

  @Prop({ type: [String] })
  area_list: string[];
}

export const DeliverySlotSchema = SchemaFactory.createForClass(DeliverySlot);
