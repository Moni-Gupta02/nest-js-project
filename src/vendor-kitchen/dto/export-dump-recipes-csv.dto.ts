import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';

export class ExportDumpRecipesCsvDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ApiPropertyOptional({
    example: ['06/20/2026', '06/21/2026'],
    description:
      'Menu live dates (MM/DD/YYYY or ISO). Omit on GET (or POST with menu_id only) to export the earliest Dump_Recipes date for that menu.',
  })
  dates?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: '66828660a623464b0adb150b',
    description: 'Optional Recipe_Menu id to filter dump documents',
  })
  menu_id?: string;
}
