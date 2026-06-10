import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class ListFilterDto {
  @ApiProperty({
    required: false,
    example: 'name', // Example search query
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    required: true,
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
  @IsNotEmpty({ message: 'Page number cannot be empty' })
  page: number;

  @ApiProperty({
    required: false,
    example: 10, // Example limit
    description: 'Number of items per page',
  })
  @IsNotEmpty({ message: 'Limit cannot be empty' })
  limit: number;
}
enum ComponentType {
  SUB_RECIPE = 'sub-recipe',
  // COMPONENT = 'component',
}
export class OptionalListFilterDto {
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

  @IsEnum(ComponentType)
  @ApiProperty({
    enum: ComponentType,
    example: 'sub-recipe',
    description: 'Type of recipe',
  })
  @IsOptional()
  recipe_type?: string;

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
export class SearchListQueryDto {
  @ApiProperty({
    description: 'Offset for pagination',
    example: 0,
    required: false,
  })
  page: number;

  @ApiProperty({
    description: 'Limit for pagination',
    example: 10,
    required: false,
  })
  limit: number;

  @ApiProperty({
    required: false,
  })
  search?: string;
}
