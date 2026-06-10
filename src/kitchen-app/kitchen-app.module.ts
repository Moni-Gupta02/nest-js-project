import { Module } from '@nestjs/common';
import { KitchenAppService } from './kitchen-app.service';
import { KitchenAppController } from './kitchen-app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { ComponentSchema } from 'src/component/Schemas/component.schema';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';
import { KitchenAppRecipeSchema } from './Schemas/kitchen-app.entity';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { supplierSchema } from 'src/supplier/schemas/supplier.schemas';
import { RecipeRatingSchema } from 'src/recipe-rating/schemas/recipe-rating.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'Rating', schema: RecipeRatingSchema },
      { name: 'Kitchen_Recipe_portining', schema: KitchenAppRecipeSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'Dump_Recipes', schema: DumpRecipesSchema },
      { name: 'Supplier', schema: supplierSchema },
    ]),
  ],
  controllers: [KitchenAppController],
  providers: [KitchenAppService],
  exports: [KitchenAppService],
})
export class KitchenAppModule {}
