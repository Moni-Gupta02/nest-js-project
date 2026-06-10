import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '../schema/content.schema';

export class CreateContentDto {
  @ApiProperty({
    enum: ContentType,
    description: 'Type of content being created',
    example: ContentType.PRIVACY_POLICY,
    enumName: 'ContentType',
  })
  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @ApiProperty({
    description: 'Title of the content',
    example: 'Privacy Policy',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Main content body (supports HTML/markdown)',
    example:
      '<h1>Privacy Policy</h1><p>This privacy policy explains how we collect and use your data...</p>',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Updated content body (supports HTML/markdown)',
    example:
      '<h1>Updated Privacy Policy</h1><p>This updated privacy policy explains...</p>',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  sub_content?: string;

  @ApiProperty({
    description: 'Version of the content (semantic versioning recommended)',
    example: '1.0.0',
    pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$',
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiPropertyOptional({
    description: 'Whether the content is active/published',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateContentDto {
  @ApiProperty({
    enum: ContentType,
    description: 'Type of content being updated',
    example: ContentType.PRIVACY_POLICY,
    enumName: 'ContentType',
  })
  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @ApiPropertyOptional({
    description: 'Updated title of the content',
    example: 'Updated Privacy Policy',
    minLength: 1,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated content body (supports HTML/markdown)',
    example:
      '<h1>Updated Privacy Policy</h1><p>This updated privacy policy explains...</p>',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated content body (supports HTML/markdown)',
    example:
      '<h1>Updated Privacy Policy</h1><p>This updated privacy policy explains...</p>',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  sub_content?: string;

  @ApiPropertyOptional({
    description: 'New version of the content',
    example: '1.1.0',
    pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    description: 'Whether the content is active/published',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ContentQueryDto {
  @ApiPropertyOptional({
    enum: ContentType,
    description: 'Filter by content type',
    example: ContentType.FAQ,
    enumName: 'ContentType',
  })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by specific version',
    example: '1.0.0',
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({
    description: 'Search term to filter content by title or content body',
    example: 'privacy policy terms',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
