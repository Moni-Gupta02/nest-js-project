import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MasterdataService } from './masterdata.service';
import { MasterdataController } from './masterdata.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MasterDataSchema } from './Schemas/masterdata.schema';
import { AllergensSchema } from 'src/common/schema/allergens.schema';
import { CategorySchema } from 'src/common/schema/category.schema';
import { CuisineSchema } from 'src/common/schema/cuisine.schema';
import { EthnicitySchema } from 'src/common/schema/ethnicity.schema';
import { DishTypeSchema } from 'src/common/schema/dish_type.schema';
import { VariantSchema } from 'src/common/schema/variants.schema';
import { RMSHistoryService } from 'src/common/utils/helper';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';
import { supplierSchema } from 'src/supplier/schemas/supplier.schemas';
import { ComponentSchema } from 'src/component/Schemas/component.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { PermissionsSchema } from 'src/roles/Schemas/roles.schema';
import { HistoryModule } from 'src/history/history.module';
import { masterSchema } from 'src/common/schema/masterData.schema';
import { TranslateSchema } from 'src/translation/schemas/translation.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: 'MasterDataKMS', schema: MasterDataSchema },
      { name: 'Allergens', schema: AllergensSchema },
      { name: 'Categories', schema: CategorySchema },
      { name: 'Cuisines', schema: CuisineSchema },
      { name: 'Dishtypes', schema: DishTypeSchema },
      { name: 'Variants', schema: VariantSchema },
      { name: 'History', schema: HistorySchema },
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'Ethnicity', schema: EthnicitySchema },
      { name: 'Supplier', schema: supplierSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Permissions', schema: PermissionsSchema },
      { name: 'masterData', schema: masterSchema },
      { name: 'translations', schema: TranslateSchema },
    ]),
    HistoryModule,
  ],
  controllers: [MasterdataController],
  providers: [MasterdataService, RMSHistoryService],
})
export class MasterdataModule {}
