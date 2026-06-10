import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TranslationUpdateDto {
  @ApiProperty({
    example: '678e11b2843a3a5666bb813f',
    description: 'Unique identifier of the translation',
    required: false,
  })
  @IsString()
  @IsOptional()
  _id?: string;

  @ApiProperty({
    example: 'How are you? Fine',
    description: 'The translated text content',
  })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({
    example: 'en',
    description: 'Language code (e.g., en, de, fr)',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  language: string;
}
export class CreateTranslateDto {
  @ApiProperty({
    example: 'greeting',
    description: 'The key of the translation',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'Used for greeting',
    description: 'Optional description of the translation',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: [TranslationUpdateDto],
    description: 'Array of translations to update',
    example: [
      {
        _id: '678e11b2843a3a5666bb813f',
        data: 'Wie geht es dir?',
        description: 'Used for greeting',
        language: 'de',
      },
      {
        data: 'how are you? fine',
        description: 'Used for greeting',
        language: 'en',
      },
    ],
  })
  @IsArray()
  @Type(() => TranslationUpdateDto)
  translations: TranslationUpdateDto[];
}

export class UpdateTranslateDto extends PartialType(CreateTranslateDto) {}

export class BulkTranslationUpdateDto {
  @ApiProperty({
    example: 'WELCOME_MESSAGE',
    description: 'Unique key identifying the translation message',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    type: [TranslationUpdateDto],
    description: 'Array of translations to update',
    example: [
      {
        _id: '678e11b2843a3a5666bb813f',
        data: 'Wie geht es dir?',
        description: 'Used for greeting',
        language: 'de',
      },
      {
        data: 'how are you? fine',
        description: 'Used for greeting',
        language: 'en',
      },
    ],
  })
  @IsArray()
  @Type(() => TranslationUpdateDto)
  translations: TranslationUpdateDto[];
}

export class BulkUpdateResponseDto {
  @ApiProperty({
    example: 'Translations updated successfully',
    description: 'Status message of the operation',
  })
  message: string;

  @ApiProperty({
    example: {
      matched: 2,
      modified: 2,
      upserted: 0,
    },
    description: 'Statistics about the bulk update operation',
  })
  data: {
    matched: number;
    modified: number;
    upserted: number;
  };

  @ApiProperty({
    example: true,
    description: 'Boolean indicating if the operation was successful',
  })
  status: boolean;
}
