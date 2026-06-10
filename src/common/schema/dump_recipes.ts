import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { RecipeMenu } from 'src/recipe-menu/Schemas/recipe_menu.schema';

@Schema({ timestamps: true })
export class DumpRecipes {
  @Prop({ type: Date })
  date: Date;

  @Prop({ type: [{ type: Object }] })
  recipes: Record<string, any>[];

  @Prop({ type: Types.ObjectId, ref: 'Recipe_Menu' })
  menu_id: RecipeMenu;

  @Prop({ default: false })
  dump_recipe_flag?: boolean;

  @Prop({ default: false })
  auto_selection_flag?: boolean;

  @Prop({ default: false })
  auto_selection_progress_flag?: boolean;

  @Prop({ default: false })
  live_on_frontend_flag?: boolean;

  @Prop({ default: false })
  notification_flag?: boolean;

  @Prop({ default: false })
  notification_progress_flag?: boolean;

  // You can keep the default values within the class definition as defaults in Mongoose
}

export type DumpRecipesDocument = DumpRecipes & Document;

export const DumpRecipesSchema = SchemaFactory.createForClass(DumpRecipes);
