// dynamic-data.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MasterDataDocument = MasterData & Document;

// Define an interface for dynamic key-value pairs
@Schema({ timestamps: true, collection: 'masterdatakms' })
export class MasterData {
  // @Prop({ required: true, unique: true })
  @Prop({ required: true })
  key: string;

  // @Prop({ required: true, unique: true })
  @Prop({ required: true })
  label: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: 'object' })
  value: object; // Dynamic field
}

export const MasterDataSchema = SchemaFactory.createForClass(MasterData);
