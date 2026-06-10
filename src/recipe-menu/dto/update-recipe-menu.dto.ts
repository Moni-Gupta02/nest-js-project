import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsDateString,
} from 'class-validator';
import { IsUniqueRecipeIds } from '../decorators/unique-recipe-id-validator';
import { RecipeList } from './create-recipe-menu.dto';

export class UpdateRecipeMenuDto {
  @ApiProperty({
    example: 'Summer Salad',
    description: 'The name of the recipe menu item',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: 12,
    description: 'A numerical identifier or the position of the menu item',
    required: false,
  })
  menu_number?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @IsUniqueRecipeIds()
  @ApiProperty({ type: [RecipeList] })
  recipe?: RecipeList[];

  @ApiProperty({
    example: true,
    description: 'Indicates whether the menu item is active',
    required: false,
  })
  is_active?: boolean;

  @ApiProperty({
    example: false,
    description: 'Indicates whether the menu item is live and available',
    required: false,
  })
  is_live?: boolean;

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
