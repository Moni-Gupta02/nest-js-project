import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsMongoId, ArrayUnique } from 'class-validator';

export class ReplaceIngredientDto {
  @IsMongoId()
  @ApiProperty({
    example: '6115fc1ea6770e4a6b8cf63f',
    description: 'ID of the component',
  })
  ingredient_id: string;

  @IsMongoId()
  @ApiProperty({
    example: '6469b8a8cdcbcc456c3d9665',
    description: 'ID of the component',
  })
  new_ingredient_id: string;

  @ApiProperty({
    example: ['6469b9c0cdcbcc456c3d96d3', '6469b8a8cdcbcc456c3d966b'],
    description: 'Types of diets suitable for the ingredient',
  })
  @IsString({ each: true, message: 'recipeId must be a string' })
  @ArrayUnique({ message: 'recipeId must be unique' })
  // @ArrayMinSize(1, { message: 'At least one diet type is required' })
  recipeIds: string[]; // Dynamic key-value pairs
}
