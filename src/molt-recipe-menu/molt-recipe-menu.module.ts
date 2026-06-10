import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MoltRecipeMenuController } from './molt-recipe-menu.controller';
import { MoltRecipeMenuService } from './molt-recipe-menu.service';
import { MoltRecipeMenuSchema } from './schemas/molt-recipe-menu.schema';
import { RecipeMenuSchema } from 'src/recipe-menu/Schemas/recipe_menu.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { CuisineSchema } from 'src/common/schema/cuisine.schema';
import { DishTypeSchema } from 'src/common/schema/dish_type.schema';
import { AllergensSchema } from 'src/common/schema/allergens.schema';
import { MasterDataSchema } from 'src/masterdata/Schemas/masterdata.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Molt_Recipe_Menu', schema: MoltRecipeMenuSchema },
      { name: 'Recipe_Menu', schema: RecipeMenuSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Cuisines', schema: CuisineSchema },
      { name: 'Dishtypes', schema: DishTypeSchema },
      { name: 'Allergens', schema: AllergensSchema },
      { name: 'MasterDataKMS', schema: MasterDataSchema },
    ]),
  ],
  controllers: [MoltRecipeMenuController],
  providers: [MoltRecipeMenuService],
  exports: [MoltRecipeMenuService],
})
export class MoltRecipeMenuModule {}
