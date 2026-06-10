import { Module } from '@nestjs/common';
import { LanguageTranslatorService } from './language-translator.service';
import { LanguageTranslatorController } from './language-translator.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TranslateSchema } from 'src/translation/schemas/translation.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'translations', schema: TranslateSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Ingredient', schema: IngredientSchema },
    ]),
  ],

  controllers: [LanguageTranslatorController],
  providers: [LanguageTranslatorService],
})
export class LanguageTranslatorModule {}
