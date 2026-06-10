import { PartialType } from '@nestjs/swagger';
import { CreateRecipeRatingDto } from './create-recipe-rating.dto';

export class UpdateRecipeRatingDto extends PartialType(CreateRecipeRatingDto) {}
