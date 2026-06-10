import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeliverySlotDocument = DeliverySlot & Document;

@Schema({ timestamps: true })
export class DeliverySlot {
  @Prop({ type: String, required: true })
  city_name: string;

  @Prop({
    type: [
      {
        area: { type: String, required: true },
        slot_list: [
          {
            timing: { type: String, required: true },
          },
        ],
      },
    ],
  })
  areas: Array<{
    area: string;
    slot_list: Array<{
      timing: string;
    }>;
  }>;
}

export const DeliverySlotSchema = SchemaFactory.createForClass(DeliverySlot);
