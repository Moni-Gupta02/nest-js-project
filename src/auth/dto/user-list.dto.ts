import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UserListFilterDto {
  @ApiProperty({
    required: false,
    example: 'name', // Example search query
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    required: false,
    example: 1, // Example page number
    description: 'Page number',
  })
  @IsOptional()
  @IsIn(['1', '-1'], { message: 'Order must be 1 or -1' })
  order?: number;

  @ApiProperty({
    required: false,
    example: 'spaghetti', // Example search query
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    example: 1, // Example page number
    description: 'Page number',
  })
  @IsOptional()
  page: number;

  @ApiProperty({
    required: false,
    example: 10, // Example limit
    description: 'Number of items per page',
  })
  @IsOptional()
  limit: number;
}
