import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ListIngredientDto {
  @ApiProperty({
    required: false,
    example: 'name', // Example search query
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    required: true,
    example: 1, // Example page number
    description: 'Page number',
  })
  @IsOptional()
  @IsIn(['1', '-1'], { message: 'Order must be 1 or -1' })
  order?: number;

  @ApiProperty({
    required: false,
    example: 'spaghetti', // Example search query
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: true,
    example: 1, // Example page number
    description: 'Page number',
  })
  @IsNotEmpty({ message: 'Page number cannot be empty' })
  page: number;

  @ApiProperty({
    required: true,
    example: 10, // Example limit
    description: 'Number of items per page',
  })
  @IsNotEmpty({ message: 'Limit cannot be empty' })
  limit: number;
}
export class FindIngredientDto {
  @ApiProperty({
    description: 'Array of Ingredient IDs to find',
    example: ['comp123', 'comp456', 'comp789'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  ingredients_ids: string[];
}
