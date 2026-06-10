import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KitchenAppRecipeManagement = KitchenAppRecipe & Document;

export class Variants {
  protein_option: string;
  size: string;
  count: number;
  protein_category: string;
}

@Schema({ timestamps: true })
export class KitchenAppRecipe {
  @Prop({ type: Types.ObjectId, ref: 'Recipes_Detail' }) // Change type to String
  recipe_id: Types.ObjectId;

  @Prop({ type: Variants })
  variants: Variants[];

  @Prop()
  date: Date;
}

export const KitchenAppRecipeSchema =
  SchemaFactory.createForClass(KitchenAppRecipe);
