// src/recipes/recipes.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecipeDocument = Recipe & Document;

// enum RecipeType {
//   RECIPE = 'recipe',
// }

enum compositionType {
  COMPONENT = 'component',
}
enum portioningType {
  EXTRA_SMALL = 'extra_small',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

enum portioningCategory {
  LOW = 'low',
  BALANCE = 'balance',
  HIGH = 'high',
  VEGETARIAN = 'vegetarian',
  PCOS = 'pcos',
  DIABETES = 'diabetes',
  SMART_SAVER = 'smart_saver',
}

enum RecipePhase {
  PHASE_1 = 1,
  PHASE_2 = 2,
}

enum RecipeStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  APPROVED = 'approved',
  NOT_APPROVED = 'not_approved',
}
export class size {
  small: number;
  medium: number;
  large: number;
  standard: number;
}
export class FinalDishImage {
  // Define the properties of the final_dish_image type
  // For example:
  url: string;
}
export class composition {
  composition_type: {
    enum: compositionType;
    default: compositionType.COMPONENT;
  };
  component_id: { type: Types.ObjectId; ref: 'Component' }; // Reference to the Supplier schema
  container_id: number; // Reference to the
  protein_category: [
    {
      enum: portioningType;
      default: portioningCategory.BALANCE;
    },
  ];
  type: string;
  small: number;
  medium: number;
  large: number;
  standard: number;
  packaging_material: { type: Types.ObjectId; ref: 'PackagingMaterial' };
  is_main: boolean;
  is_inside: boolean;
  is_separate: boolean;
  label: string;
  portioning_balance: [
    {
      protein_type: string;
      protein_category: {
        enum: portioningType;
        default: portioningCategory.BALANCE;
      };
      type: { enum: portioningType; default: portioningType.SMALL };
      price: number;
      kcal: number;
      carb: number;
      fat: number;
      protein: number;
      // is_finalized: { type: boolean; default: false };
      packaging_material: { type: Types.ObjectId; ref: 'PackagingMaterial' };
      material: string;
      description: string;
      instruction: string;
      is_main: boolean;
      is_inside: boolean;
      is_separate: boolean;
    },
  ];
  price: { type: size };
  kcal: { type: size };
  fat: { type: size };
  protein: { type: size };
  description: string;
  instruction: string;
}

export class cookingMethod {
  step: number;
  outcome: string;
  image: string[];
}

export class plattingMethod {
  step: number;
  outcome: string;
  @Prop({ required: false })
  image: string[];
  // @Prop({ type: portioningCategory, required: false })
  // category: string;
}

export class portioning {
  protein_type: string;
  image: string[];
  // protein_category: {
  //   enum: portioningCategory;
  //   default: portioningCategory.BALANCE;
  // };
}
export class price {
  protein_category: string;
  protein_type: string;
  price: number;
  average_price: number;
  average_weight: number;
  size_prices: size;
  size_weights: size;
}

export interface LanguageStrings {
  [key: string]: string;
}

export class AllTypeDishImages {
  url: string;
  type: string;
  size: string; //optional
}
export class proteinCategory {
  @Prop({ type: portioningCategory })
  category: string;

  @Prop({ required: true, unique: true })
  dish_name: string;

  @Prop({ type: Object, required: true })
  dish_name_tl: LanguageStrings;

  @Prop({ required: true, unique: true })
  description: string;

  @Prop({ type: Object, required: true })
  description_tl: LanguageStrings;

  image: string[];
  @Prop({ type: [AllTypeDishImages] }) // Use the FinalDishImage type as an array
  image_variants: AllTypeDishImages[];
  internal_image: string[];
  @Prop({ type: [AllTypeDishImages] }) // Use the FinalDishImage type as an array
  internal_image_variants: AllTypeDishImages[];
  plating_instruction: string;
  label_instruction: string;
  portioning: portioning[];
  @Prop({ type: plattingMethod })
  platting_method: plattingMethod[];
}

@Schema({ timestamps: true })
export class Recipe {
  @Prop({ required: true, unique: true })
  dish_name: string;

  @Prop()
  meal_category: string;

  @Prop()
  category_type: string;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Cuisines' }) // Change type to String
  cuisine: string;

  @Prop()
  spice_level: string;

  @Prop()
  protein_size: string[];

  @Prop({ type: [proteinCategory] })
  protein_category: proteinCategory[];

  @Prop()
  cooking_complexity: string;

  @Prop()
  plating_complexity: string;

  @Prop()
  highly_perishable: boolean;

  @Prop({ type: [FinalDishImage] }) // Use the FinalDishImage type as an array
  final_dish_image: FinalDishImage[];

  @Prop({ type: [AllTypeDishImages] }) // Use the FinalDishImage type as an array
  final_dish_image_variants: AllTypeDishImages[];

  @Prop({ type: [{ type: String, ref: 'Dishtypes' }] }) // Change type to String
  dish_type: string[]; // Change Cuisine[] to string[]

  @Prop({ default: false })
  is_active: boolean;

  @Prop({ type: composition })
  composition: composition[];

  @Prop({ type: size })
  calculated_weight: size;

  @Prop({ type: size })
  calculated_price: size;

  @Prop({ type: cookingMethod })
  cooking_method: cookingMethod[];

  // @Prop({ type: portioning })
  // portioning: portioning[];

  @Prop({ type: [{ type: String, ref: 'Allergens' }], default: [] })
  allergens: string[];

  @Prop({ type: [{ type: String, ref: 'MasterDataKMS' }], default: [] })
  diet_type: string[];

  @Prop({ enum: RecipeStatus, default: RecipeStatus.DRAFT })
  status: RecipeStatus;

  @Prop({ default: false })
  is_live: boolean;

  @Prop({ type: price })
  price: price[];

  @Prop()
  plating_instruction: string;

  @Prop()
  label_instruction: string;

  @Prop({ default: [] })
  recommendation: string[];

  @Prop({ enum: RecipePhase, required: false })
  phase?: number | null;
}

export const RecipeSchema = SchemaFactory.createForClass(Recipe);
