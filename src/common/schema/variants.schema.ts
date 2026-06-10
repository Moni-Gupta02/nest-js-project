import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Ingredient } from 'src/ingredient/schemas/ingredient.schema';

export type VariantDataDocument = Variant & Document;

@Schema({ timestamps: true })
export class Variant {
  @Prop({ type: String, required: true })
  display_name: string;

  @Prop({ type: String, required: true, unique: true })
  internal_name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Ingredient' }] })
  ingredients: Ingredient[];

  @Prop({ type: Boolean })
  is_active: boolean;

  // @Prop({ type: [String] })
  // ingredients_name: string[];
}

export const VariantSchema = SchemaFactory.createForClass(Variant);
