import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CuisineDataDocument = Cuisine & Document;

@Schema({ timestamps: true, collection: 'cuisines' })
export class Cuisine {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ type: Boolean })
  is_active: boolean;
}

export const CuisineSchema = SchemaFactory.createForClass(Cuisine);
