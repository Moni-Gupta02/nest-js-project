import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CuisineSchema } from 'src/common/schema/cuisine.schema';
import { DishTypeSchema } from 'src/common/schema/dish_type.schema';
import { PriceUpdateService, RMSHistoryService } from 'src/common/utils/helper';
import { ComponentSchema } from 'src/component/Schemas/component.schema';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';
import { MasterDataSchema } from 'src/masterdata/Schemas/masterdata.schema';
import { PackagingMaterialSchema } from 'src/packaging-material/Schemas/packaging-material.entity';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RecipeSchema } from './schemas/recipe.schema';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { UniqueNameService } from 'src/common/utils/uniqueNameService';
import { UniqueComponentIdValidatorService } from './decorators/unique-component-id-validator';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { RecipeRatingSchema } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { HistoryService } from 'src/history/history.service';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Cuisines', schema: CuisineSchema },
      { name: 'Dump_Recipes', schema: DumpRecipesSchema },
      { name: 'MasterDataKMS', schema: MasterDataSchema },
      { name: 'Dishtypes', schema: DishTypeSchema },
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'PackagingMaterial', schema: PackagingMaterialSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'History', schema: HistorySchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'Rating', schema: RecipeRatingSchema },
      { name: 'Delivery', schema: DeliverySchema },
      { name: 'admin_history', schema: AdminHistorySchema },
    ]),
  ],
  controllers: [RecipesController],
  providers: [
    RecipesService,
    PriceUpdateService,
    RMSHistoryService,
    HistoryService,
    AdminHistoryService,
    UniqueNameService,
    UniqueComponentIdValidatorService,
  ],
})
export class RecipesModule {}
