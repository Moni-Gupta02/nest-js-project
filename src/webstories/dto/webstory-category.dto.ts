import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWebStoriesCategoryDto {
  @ApiProperty({
    example: 'Lifestyle',
    description: 'Category for the web story',
  })
  @IsString()
  @IsNotEmpty()
  category: string;
}

export class UpdateWebStoriesCategoryDto {
  @ApiProperty({
    example: 'Technology',
    description: 'Updated category for the web story',
  })
  @IsString()
  category?: string;
}
