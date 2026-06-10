import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DishTypeDataDocument = DishType & Document;

@Schema({ timestamps: true })
export class DishType {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: Boolean })
  is_active: boolean;
}

export const DishTypeSchema = SchemaFactory.createForClass(DishType);
