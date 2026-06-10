import { Schema, Document } from 'mongoose';

export interface OwnDelivery extends Document {
  city: string;
  area: {
    name: string;
    slot_list: { before_time: string; after_time: string; time: string }[];
  }[];
}

export const OwnDeliverySchema = new Schema({
  city: { type: String, required: true },
  area: [
    {
      name: { type: String, required: true },
      slot_list: [
        {
          before_time: { type: String, required: true },
          after_time: { type: String, required: true },
          time: { type: String },
        },
      ],
    },
  ],
}, { collection: 'own_deliveries' });
