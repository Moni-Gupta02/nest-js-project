import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AllergensDataDocument = Allergens & Document;

@Schema({ timestamps: true })
export class Allergens {
  @Prop({ type: String })
  name: string;

  @Prop({ type: Boolean, default: false })
  is_vegetarian: boolean;

  @Prop({ type: Boolean })
  is_non_vegetarian: boolean;

  @Prop({ type: Boolean })
  is_active: boolean;
}

export const AllergensSchema = SchemaFactory.createForClass(Allergens);
