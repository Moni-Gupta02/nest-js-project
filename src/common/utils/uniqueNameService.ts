import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ComponentDocument } from 'src/component/Schemas/component.schema';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { IngredientDocument } from 'src/ingredient/schemas/ingredient.schema';

@Injectable()
export class UniqueNameService {
  constructor(
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
  ) {}

  private models: { [key: string]: Model<any> } = {
    component: this.componentModel,
    recipe: this.recipeModel,
    ingredient: this.ingredientModel,
  };

  async isNameUnique(
    modelName: string,
    nameField: string,
    nameValue: string,
  ): Promise<boolean> {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const count = await model.countDocuments({ [nameField]: nameValue }).exec();
    return count === 0;
  }
  async isExist(
    modelName: string,
    nameField: string,
    nameValue: string,
  ): Promise<boolean> {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const count = await model.countDocuments({ [nameField]: nameValue }).exec();
    return count === 1;
  }
}
