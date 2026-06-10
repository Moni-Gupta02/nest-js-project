import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBlogCategoryDto {
  @ApiProperty({ example: 'Tech', description: 'category name for the blog' })
  @IsString()
  @IsNotEmpty()
  category: string;
}

export class UpdateBlogCategoryDto {
  @ApiProperty({
    example: 'Technology',
    description: 'Updated category name for the blog',
  })
  @IsString()
  category?: string;
}
