import { Schema, Document } from 'mongoose';

export interface Sequence extends Document {
  sequence_name: string;
  sequence_value: number;
}

export const SequenceSchema = new Schema(
  {
    sequence_name: { type: String, required: true },
    sequence_value: { type: Number, required: true },
  },
  { timestamps: true },
);
