import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategorySchema } from 'src/common/schema/category.schema';
import { PriceUpdateService, RMSHistoryService } from 'src/common/utils/helper';
import { ComponentSchema } from 'src/component/Schemas/component.schema';
import { MasterDataSchema } from 'src/masterdata/Schemas/masterdata.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { supplierSchema } from 'src/supplier/schemas/supplier.schemas';
import { IngredientController } from './ingredient.controller';
import { IngredientService } from './ingredient.service';
import { IngredientSchema } from './schemas/ingredient.schema';
import { PermissionsSchema } from 'src/roles/Schemas/roles.schema';
import { RolesService } from 'src/roles/roles.service';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { ComponentService } from 'src/component/component.service';
import { UniqueNameService } from 'src/common/utils/uniqueNameService';
import { HistoryService } from 'src/history/history.service';
import { TranslateSchema } from 'src/translation/schemas/translation.schema';
import { SubscriptionSchema } from 'src/subscription/schemas/subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'MasterDataKMS', schema: MasterDataSchema },
      { name: 'Category', schema: CategorySchema },
      { name: 'Supplier', schema: supplierSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Permissions', schema: PermissionsSchema },
      { name: 'History', schema: HistorySchema },
      { name: 'translations', schema: TranslateSchema },
      { name: 'Subscriptions', schema: SubscriptionSchema },
    ]),
  ],
  controllers: [IngredientController],
  providers: [
    IngredientService,
    PriceUpdateService,
    HistoryService,
    UniqueNameService,
    RolesService,
    RMSHistoryService,
    ComponentService,
  ],
})
export class IngredientModule {}
