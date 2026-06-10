import { Controller, Post, Body, Req } from '@nestjs/common';
import { RecipeRatingService } from './recipe-rating.service';
import { CreateRecipeRatingDto } from './dto/create-recipe-rating.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiBearerAuth('access-token')
@ApiTags('recipe-rating')
@Controller('recipe-rating')
export class RecipeRatingController {
  constructor(private readonly recipeRatingService: RecipeRatingService) {}

  @Permissions({ resource: 'recipe-rating', actions: 'read' })
  @Post('add-rating')
  async create(
    @Body() createRecipeRatingDto: CreateRecipeRatingDto,
    @Req() request: Request,
  ) {
    try {
      const user = request['user'];
      console.log('User from token:', user);
      const result = await this.recipeRatingService.create(
        user,
        createRecipeRatingDto,
      );
      return {
        message: message.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
