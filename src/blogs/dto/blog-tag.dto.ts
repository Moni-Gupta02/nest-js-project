import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBlogTagDto {
  @ApiProperty({ example: 'Tech', description: 'Tag name for the blog' })
  @IsString()
  @IsNotEmpty()
  tag: string;
}

export class UpdateBlogTagDto {
  @ApiProperty({
    example: 'Technology',
    description: 'Updated tag name for the blog',
  })
  @IsString()
  tag?: string;
}
