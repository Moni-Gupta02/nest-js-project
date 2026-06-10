import { Module } from '@nestjs/common';
import { FoodRecipeService } from './food-recipe.service';
import { FoodRecipeController } from './food-recipe.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FoodRecipeSchema } from './schemas/food-recipe.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'food_recipes', schema: FoodRecipeSchema },
    ]),
  ],
  controllers: [FoodRecipeController],
  providers: [FoodRecipeService],
})
export class FoodRecipeModule {}
