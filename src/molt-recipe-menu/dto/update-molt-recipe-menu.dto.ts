import { ApiPropertyOptional } from '@nestjs/swagger';
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

class UpdateRecipeTypeDto {
  @ApiPropertyOptional({ example: ['Chicken', 'Beef'] })
  @IsOptional()
  @IsArray()
  protein_option?: string[];

  @ApiPropertyOptional({ example: 'balance' })
  @IsOptional()
  @IsString()
  protein_category?: string;
}

class UpdateRecipeListDto {
  @ApiPropertyOptional({ example: '6672c6f53903cc867a83feea' })
  @IsOptional()
  @IsString()
  recipe_id?: string;

  @ApiPropertyOptional({ type: [UpdateRecipeTypeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRecipeTypeDto)
  type?: UpdateRecipeTypeDto[];
}

export class UpdateMoltRecipeMenuDto {
  @ApiPropertyOptional({ example: 'Week 23 Menu - Updated' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 23 })
  @IsOptional()
  @IsNumber()
  menu_number?: number;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-07' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [UpdateRecipeListDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRecipeListDto)
  recipe?: UpdateRecipeListDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_live?: boolean;
}
