import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecipeMenuDocument = RecipeMenu & Document;

class TypeSchema {
  @Prop({ type: [String], default: [] })
  protein_option: string[];

  @Prop({ type: String })
  protein_category: string;
}

export class RecipeList {
  @Prop({ type: Types.ObjectId, ref: 'Recipes_Detail' }) // Change type to String
  recipe_id: Types.ObjectId;

  @Prop({ type: [TypeSchema], default: [] })
  type: TypeSchema[]; // Array of objects for referencing Components with protein_category
}

@Schema({ timestamps: true })
export class RecipeMenu {
  @Prop({ type: String })
  name: string;

  @Prop({ type: Number })
  menu_number: number;

  @Prop({ type: [RecipeList], default: [] }) // Specify array type for RecipeList
  recipe: RecipeList[];

  @Prop({ type: Boolean })
  is_active: boolean;

  @Prop({ type: Boolean })
  is_live: boolean;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;
}

export const RecipeMenuSchema = SchemaFactory.createForClass(RecipeMenu);
