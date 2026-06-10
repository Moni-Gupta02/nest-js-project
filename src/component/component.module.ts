import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PriceUpdateService } from 'src/common/utils/helper';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { ComponentController } from './component.controller';
import { ComponentService } from './component.service';
import { ComponentSchema } from './Schemas/component.schema';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { UniqueNameService } from 'src/common/utils/uniqueNameService';
import { UniqueComponentIdValidatorService } from 'src/recipes/decorators/unique-component-id-validator';
import { HistoryService } from 'src/history/history.service';
import { MasterDataSchema } from 'src/masterdata/Schemas/masterdata.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MasterDataKMS', schema: MasterDataSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'History', schema: HistorySchema },
    ]),
  ],
  controllers: [ComponentController],
  providers: [
    ComponentService,
    PriceUpdateService,
    HistoryService,
    UniqueNameService,
    UniqueComponentIdValidatorService,
  ],
})
export class ComponentModule {}
