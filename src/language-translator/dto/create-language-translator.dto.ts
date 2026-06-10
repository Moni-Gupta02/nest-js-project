import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StoreTranslationDto {
  @ApiProperty({ example: 'WELCOME_MESSAGE' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Hello', description: 'The translation data' })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({
    example: 'Used for greeting',
    description: 'Optional description of the translation',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'ar', description: 'Target language code' })
  @IsString()
  @IsNotEmpty()
  language: string;
}

export class TranslateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'WELCOME_MESSAGE' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Hello', description: 'The translation data' })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({
    example: 'Used for greeting',
    description: 'Optional description of the translation',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'ar', description: 'Target language code' })
  @IsString()
  @IsNotEmpty()
  language: string;
}
export class UpdateTextDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty()
  @IsString()
  targetLanguage: string;
}
