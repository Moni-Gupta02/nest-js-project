import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FoodRecipe } from './schemas/food-recipe.schema';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';

@Injectable()
export class FoodRecipeService {
  constructor(
    @InjectModel('food_recipes') private foodRecipeModel: Model<FoodRecipe>,
  ) {}

  async getFoodRecipeList(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ) {
    try {
      const query = search
        ? { recipe_name: { $regex: search, $options: 'i' } }
        : {};

      const ingredientData = await this.foodRecipeModel
        .find(query)
        .select('recipe_name image about')
        .sort({ recipe_name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
      const count = await this.foodRecipeModel.countDocuments(query).exec();

      return {
        list: ingredientData,
        count,
        currentPage: +page,
        totalPages: Math.ceil(count / Number(limit)),
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  findOne(id: number) {
    return `This action returns a #${id} foodRecipe`;
  }

  remove(id: number) {
    return `This action removes a #${id} foodRecipe`;
  }
}
