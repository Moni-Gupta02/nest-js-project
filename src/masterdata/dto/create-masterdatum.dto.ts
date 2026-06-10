// dynamic-data.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TranslationUpdateDto {
  @ApiProperty({
    example: 'دجاج مشوي',
  })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({
    example: 'ar',
    description: 'Language code (e.g., en, de, fr)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  language: string;
}
export class CreateMasterdatumDto {
  @ApiProperty({
    description: 'Master data name',
    example: 'ingredient_master_data',
    required: true,
  })
  @IsString({ message: 'Key must be string' })
  key: string;

  @ApiProperty({
    description: 'Master Data Label',
    example: 'Ingredient Master Data',
    required: true,
  })
  @IsString({ message: 'Label must be string' })
  label: string;

  @ApiProperty({
    type: 'array',
    description: 'Value of Perticular Master Data',
    example: [
      { key: 'key_name', value: 'value_name', value_tl: { ar: 'مشوي دجاج' } },
    ],
  })
  @IsArray({ message: 'Value must be array type' })
  @ValidateNested({ each: true })
  @Type(() => Object)
  value: Record<string, any>[];

  @ApiProperty({
    type: [TranslationUpdateDto],
    description: 'Array of translations to update',
    example: [
      {
        data: 'دجاج مشوي',
        language: 'ar',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @Type(() => TranslationUpdateDto)
  key_translations?: TranslationUpdateDto[];
}
