import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FoodRecipe extends Document {
  @Prop()
  recipe_name: string;

  @Prop()
  image: string;

  @Prop()
  thumbnail_image: string;

  @Prop()
  about: string;

  @Prop()
  ingredients: string;

  @Prop()
  dressings: string;

  @Prop({ type: [{ _id: String, title: String, description: String }] })
  choice_of_protein: Array<{ _id: string; title: string; description: string }>;

  @Prop({ type: [{ _id: String, key: String, value: String }] })
  nutritional_info: Array<{ _id: string; key: string; value: string }>;

  @Prop({ type: [{ _id: String, key: String, value: String }] })
  vitamins_and_minerals: Array<{ _id: string; key: string; value: string }>;

  @Prop()
  instructions: string;

  @Prop()
  best_suited_for_description: string;

  @Prop()
  when_to_eat_description: string;

  @Prop({ type: [{ _id: String, title: String, description: String }] })
  best_suited_for_content: Array<{
    _id: string;
    title: string;
    description: string;
  }>;

  @Prop()
  when_to_eat: string;

  @Prop()
  foodies_say: string;

  @Prop()
  conclusion: string;

  @Prop({ type: [{ _id: String, question: String, answer: String }] })
  faqs: Array<{ _id: string; question: string; answer: string }>;

  @Prop()
  kcal: string;

  @Prop()
  carb: string;

  @Prop()
  protein: string;

  @Prop()
  fat: string;

  @Prop()
  cuisine: string;

  @Prop()
  cooking_time: string;

  @Prop()
  meta_title: string;

  @Prop()
  meta_description: string;

  @Prop()
  slug: string;
}

export const FoodRecipeSchema = SchemaFactory.createForClass(FoodRecipe);
