import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComponentDocument = Component & Document;
enum RecipeType {
  SUB_RECIPE = 'sub-recipe',
}

enum compositionType {
  INGREDIENT = 'ingredient',
  SUB_RECIPE = 'sub-recipe',
}

export class FinalDishImage {
  // Define the properties of the final_dish_image type
  // For example:
  url: string;
}
export class cookingMethod {
  step: number;
  outcome: string;
  image: string[];
}
export class composition {
  composition_type: {
    enum: compositionType;
    default: compositionType.SUB_RECIPE;
  };
  component_id: { type: Types.ObjectId; ref: 'Component' }; // Reference to the Supplier schema
  ingredient_id: { type: Types.ObjectId; ref: 'Ingredient' }; // Reference to the Supplier schema
  container_id: number; // Reference to the
  net_qty: { type: number; default: 0 };
  unit: { type: string; default: 'g' };
  waste: { type: number; default: 0 };
  cutting_style: string;
  remark: string;
  mise_en_place: { type: boolean; default: false };
  price: { type: number; default: 0 };
  carb: { type: number; default: 0 };
  kcal: { type: number; default: 0 };
  fat: { type: number; default: 0 };
  protein: { type: number; default: 0 };
}

@Schema({ timestamps: true })
export class Component {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  cooking_complexity: string;

  @Prop({ type: Boolean, default: false })
  useblefor_other: boolean;

  @Prop({ type: Boolean, default: false })
  is_frozen: boolean;

  @Prop({ type: Boolean, default: false })
  stockable: boolean;

  @Prop({ type: Boolean, default: false })
  highly_perishable: boolean;

  // @Prop()
  // shelf_life: number;

  // @Prop()
  // shelf_life_unit: string;

  @Prop({ type: [FinalDishImage] }) // Use the FinalDishImage type as an array
  final_dish_image: FinalDishImage[];

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ enum: RecipeType, default: RecipeType.SUB_RECIPE })
  recipe_type: string;

  @Prop({ type: composition })
  composition: composition[];

  @Prop({ type: cookingMethod })
  cooking_method: cookingMethod[];

  @Prop({ type: Boolean, default: true })
  use_calculated_weight: boolean;

  @Prop()
  calculated_weight: number;

  @Prop()
  calculated_price: number;

  @Prop()
  manual_weight: number;

  @Prop({ type: [{ type: String, ref: 'Allergens' }], default: [] })
  allergens: string[];

  @Prop({ type: [{ type: String, ref: 'MasterDataKMS' }], default: [] })
  diet_type: string[];

  @Prop({ type: [{ type: String, ref: 'Recipes_Detail' }], default: [] })
  dish_tag: string[];
  // @Prop({ type: [Types.ObjectId], ref: 'Component', default: [] })
  // parent_ids: Types.ObjectId[];

  // @Prop({ type: [Types.ObjectId], ref: 'Component', default: [] })
  // parent_ids: Types.ObjectId[];
}

export const ComponentSchema = SchemaFactory.createForClass(Component);

// Virtual field to get children
// ComponentSchema.virtual('children', {
//   ref: 'Component',
//   localField: '_id',
//   foreignField: 'parent_ids',
// });

// ComponentSchema.set('toObject', { virtuals: true });
// ComponentSchema.set('toJSON', { virtuals: true });
