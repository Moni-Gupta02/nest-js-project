import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IngredientDocument = Ingredient & Document;

export class Nutrition {
  @Prop()
  kcal: number;

  @Prop()
  protein: number;

  @Prop()
  carb: number;

  @Prop()
  fat: number;
}

export class Supplier_Details {
  image: string[];
  product_name: string;
  supplier: { type: Types.ObjectId; ref: 'Supplier' };
  supplier_article: string;
  conversion_ratio: number;
  supplier_pref: number;
  single_package: {
    size: number;
    unit: string;
    price: number;
    per_kg_price: number;
  };
  bulk_package: {
    size: number;
    unit: string;
    price: number;
    per_kg_price: number;
    bulk_number: number;
    single_package_orderable: boolean;
  };
  is_active: boolean;
}
export interface LanguageStrings {
  [key: string]: string;
}

@Schema({ timestamps: true, collection: 'ingredients' })
export class Ingredient {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  name_of_customers: string;

  @Prop({ type: Object, required: false })
  name_of_customers_tl?: LanguageStrings;

  @Prop({ type: [{ type: String, ref: 'MasterDataKMS' }] }) // Change type to String
  category: string[]; // Change Cuisine[] to string[]

  @Prop()
  storage_location: string;

  @Prop()
  ingredient_type: string;

  @Prop()
  shelf_life: number;

  @Prop()
  shelf_life_unit: string;

  @Prop({ default: 0 })
  waste: number;

  @Prop()
  unit_of_measurement: string;

  @Prop({ default: false })
  is_weighted: boolean;

  @Prop({ default: false })
  is_piece: boolean;

  @Prop()
  package_type: string;

  @Prop({ type: Supplier_Details })
  supplier_details: Supplier_Details[];

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: [{ type: String, ref: 'Allergens' }], default: [] })
  allergens: string[];

  @Prop({ type: [{ type: String, ref: 'MasterDataKMS' }], default: [] })
  diet_type: string[];

  @Prop({ type: Nutrition }) // Reference Nutrition class as type
  nutrition: Nutrition;

  @Prop({ default: true })
  show_customers: boolean;
}

export const IngredientSchema = SchemaFactory.createForClass(Ingredient);
