import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsDateString,
} from 'class-validator';
import { IsUniqueRecipeIds } from '../decorators/unique-recipe-id-validator';
export class RecipeList {
  @ApiProperty({
    example: '6672c6f53903cc867a83feea',
    description: 'The ObjectId of the associated recipe in string format',
    required: true,
  })
  recipe_id?: string;

  @ArrayMinSize(1)
  @ApiProperty({
    example: ['Chicken', 'Beef'],
    description: 'An array of string representing associated components',
    required: true,
  })
  type?: string[];

  @ArrayMinSize(1)
  @ApiProperty({
    example: ['balance'],
    description: 'An array of string representing associated components',
    required: true,
  })
  protein_category?: string[];
}
export class CreateRecipeMenuDto {
  @ApiProperty({
    example: 'Summer Salad',
    description: 'The name of the recipe menu item',
  })
  @Optional()
  name: string;

  @ApiProperty({
    example: 12,
    description: 'A numerical identifier or the position of the menu item',
  })
  @Optional()
  menu_number: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @IsUniqueRecipeIds()
  @ApiProperty({ type: [RecipeList], description: 'List of Recipe' })
  recipe: RecipeList[];

  @ApiProperty({
    example: true,
    description: 'Indicates whether the menu item is active',
  })
  is_active: boolean;

  @ApiProperty({
    example: false,
    description: 'Indicates whether the menu item is live and available',
  })
  is_live: boolean;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Start date for the menu in ISO date format (YYYY-MM-DD)',
    required: true,
  })
  @IsString()
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2024-12-31',
    description: 'End date for the menu in ISO date format (YYYY-MM-DD)',
    required: true,
  })
  @IsString()
  @IsDateString()
  endDate: string;
}
