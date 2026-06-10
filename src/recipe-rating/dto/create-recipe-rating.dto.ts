// create-recipe-rating.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
// import { IsUnique } from 'src/common/decorators/is-unique.decorators';

export class CreateRecipeRatingDto {
  @ApiProperty({
    description: 'The ID of the recipe',
    type: String,
  })
  @IsMongoId()
  // @IsUnique('Rating', 'recipe_id', {
  //   message: 'recipe_id must be unique',
  // })
  //   customer_id: string;
  recipe_id: string;
  @ApiProperty({
    description: 'The ID of the delivery',
    type: String,
  })
  @IsMongoId()
  // @IsUnique('Rating', 'recipe_id', {
  //   message: 'recipe_id must be unique',
  // })
  //   customer_id: string;
  delivery_id: string;
  @ApiProperty({
    description: 'The rating of the recipe, between 1 and 5',
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Optional comment about the recipe',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
