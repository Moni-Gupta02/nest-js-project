import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  commentCategory,
  DietCategory,
} from 'src/kitchen-app/dto/get-kitchen-app.dto';

export class ListRecipeDto {
  @ApiProperty({
    required: false,
    example: 'dish_name', // Example search query
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    required: false,
    example: 1, // Example order
  })
  @IsOptional()
  @IsIn([1, -1], { message: 'Order must be 1 or -1' })
  @Type(() => Number)
  order?: number;

  @ApiProperty({
    required: false,
    example: 'Recipe Name', // Example search query
  })
  @IsOptional()
  @IsString()
  dish_name?: string;

  @ApiProperty({
    required: false,
    example: false, // Example is_live status
  })
  @IsOptional()
  @IsString()
  is_live?: string;

  @ApiProperty({
    required: false,
    example: 'subscription',
  })
  @IsOptional()
  @IsString()
  category_type?: string;

  @ApiProperty({
    required: false,
    example: ['Meal'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return [];
    return value
      .split(',')
      .map((item: string) => item.trim())
      .filter((item) => item.length > 0);
  })
  @IsArray()
  @IsString({ each: true })
  meal_category?: string[];

  @ApiProperty({
    required: false,
    example: ['small'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return [];
    return value
      .split(',')
      .map((item: string) => item.trim())
      .filter((item) => item.length > 0);
  })
  @IsArray()
  @IsString({ each: true })
  protein_size?: string[];

  @ApiProperty({
    required: false,
    example: ['balance'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return [];
    return value
      .split(',')
      .map((item: string) => item.trim())
      .filter((item) => item.length > 0);
  })
  @IsArray()
  @IsString({ each: true })
  protein_category?: string[];

  @ApiProperty({
    example: 1, // Example page number
    description: 'Page number',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty({ message: 'Page number cannot be empty' })
  page?: number;

  @ApiProperty({
    example: 10, // Example limit
    description: 'Number of items per page',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty({ message: 'Limit cannot be empty' })
  limit?: number;
}
export class GetRecipeWiseRatingDto {
  @IsString()
  @IsOptional() // Ensures the array is not empty
  @ApiProperty({
    example: '2025-01-06',
    description: 'Start date',
    required: true,
  })
  startDate: string;

  @IsString()
  @IsOptional() // Ensures the array is not empty
  @ApiProperty({
    example: '2025-01-11',
    description: 'End date',
    required: true,
  })
  endDate: string;

  @ApiProperty({
    required: false,
    example: 'customer_name', // Example search query
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: DietCategory.BALANCE,
    description: 'The category of the meal. Accepted values: low, balance.',
    required: false,
    enum: DietCategory,
  })
  diet_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Chicken',
    required: false,
    enum: DietCategory,
  })
  protein_option?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '1,2',
    required: false,
  })
  rating?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'yes',
    description: 'The category of the review. Accepted values: yes, no ,all.',
    required: false,
    enum: commentCategory,
  })
  review?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'yes',
    description: 'The category of the comment. Accepted values: yes, no ,all.',
    required: false,
    enum: commentCategory,
  })
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiProperty({
    required: false,
    example: '1', // Example page number
    description: 'Page number',
  })
  @IsOptional()
  // @IsIn(['1', '-1'], { message: 'Order must be 1 or -1' })
  order?: string;

  @ApiProperty({
    required: false,
    example: 'spaghetti', // Example search query
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: true,
    example: '674aba1851f3a3493e6f90a4', // Example search query
  })
  @IsString()
  recipe_id: string;

  @ApiProperty({
    required: false,
    example: '1', // Example page number
    description: 'Page number',
  })
  @IsOptional()
  page: string;

  @ApiProperty({
    required: false,
    example: '10', // Example limit
    description: 'Number of items per page',
  })
  @IsOptional()
  limit: string;
}
