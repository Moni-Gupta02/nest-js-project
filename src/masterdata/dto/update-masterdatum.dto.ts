import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

export class UpdateMasterdatumDto {
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
    example: '[]',
  })
  @IsArray({ message: 'Value must be array type' })
  value: object[];

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
