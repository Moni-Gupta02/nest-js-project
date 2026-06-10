import { Controller, Get, Param, Delete, Query } from '@nestjs/common';
import { FoodRecipeService } from './food-recipe.service';
import { OptionalListFilterDto } from './dto/food-recipe.dto';
import { Public } from 'src/common/decorators';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Food Recipes')
@Controller('food-recipe')
export class FoodRecipeController {
  constructor(private readonly foodRecipeService: FoodRecipeService) {}

  @Public()
  @Get('list')
  async foodRecipe(@Query() foodRecipeDto: OptionalListFilterDto) {
    const foodRecipeData = await this.foodRecipeService.getFoodRecipeList(
      foodRecipeDto.search,
      foodRecipeDto.page,
      foodRecipeDto.limit,
    );

    return {
      message: 'Food recipes retrieved successfully',
      data: foodRecipeData,
      status: true,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.foodRecipeService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.foodRecipeService.remove(+id);
  }
}
