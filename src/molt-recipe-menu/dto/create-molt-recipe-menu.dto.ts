import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class RecipeTypeDto {
  @ApiPropertyOptional({ example: ['Chicken', 'Beef'] })
  @IsOptional()
  @IsArray()
  protein_option?: string[];

  @ApiPropertyOptional({ example: 'balance' })
  @IsOptional()
  @IsString()
  protein_category?: string;
}

class RecipeListDto {
  @ApiProperty({ example: '6672c6f53903cc867a83feea' })
  @IsString()
  recipe_id: string;

  @ApiPropertyOptional({ type: [RecipeTypeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeTypeDto)
  type?: RecipeTypeDto[];
}

export class CreateMoltRecipeMenuDto {
  @ApiPropertyOptional({ example: 'Week 23 Menu' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 23 })
  @IsOptional()
  @IsNumber()
  menu_number?: number;

  @ApiPropertyOptional({ type: [RecipeListDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeListDto)
  recipe?: RecipeListDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_live?: boolean;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-07' })
  @IsDateString()
  endDate: string;
}
