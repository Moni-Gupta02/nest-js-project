import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class ContentDto {
  @ApiProperty({ example: '1' })
  @IsString()
  _id: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  content_image: string;

  @ApiProperty({ example: 'Content Title' })
  @IsString()
  content_title: string;

  @ApiProperty({ example: 'Content Description' })
  @IsString()
  content_description: string;

  @ApiProperty({ example: 'Click Here' })
  @IsString()
  cta_button_title: string;

  @ApiProperty({ example: 'https://example.com' })
  @IsString()
  button_link: string;
}

export class CreateWebStoryDto {
  @ApiProperty({ example: 'My Web Story' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: ['Technology', 'News'] })
  @IsArray()
  @IsString({ each: true })
  category: string[];

  @ApiProperty({ example: 'Story description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'https://example.com/thumbnail.jpg' })
  @IsString()
  thumbnail_image: string;

  @ApiProperty({ example: 'my-web-story' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({ example: 'Popular Stories' })
  @IsString()
  section: string;

  @ApiProperty({ type: [ContentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentDto)
  content: ContentDto[];
}
