import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export enum MealCategory {
  MEAL = 'Meal',
  BREAKFAST = 'Breakfast',
  SNACK = 'Snack',
}

export enum DietCategory {
  LOW = 'low',
  BALANCE = 'balance',
}
export enum commentCategory {
  YES = 'yes',
  NO = 'no',
  ALL = 'all',
}
export enum FilterEnum {
  CATEGORY = 'category',
  RECIPE = 'recipe',
  DATE = 'date',
}
export class GetRecipePortionDto {
  @ApiProperty({
    example: '665335b74619e77f0da2f342',
    description: 'Recipe ID',
  })
  @IsString()
  @IsNotEmpty()
  recipe_id: string;

  @ApiProperty({
    example: '01/07/2024',
    description: 'Recipe Date',
  })
  @IsString()
  @IsNotEmpty()
  date: string;
}

export class GetKitchenRecipeListDto {
  @ApiProperty({
    example: '2025-01-06',
    description: 'Start date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  startDate: string;

  @ApiProperty({
    example: '2025-01-11',
    description: 'End date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  endDate: string;

  @ApiProperty({
    example: MealCategory.MEAL,
    description:
      'The category of the meal. Accepted values: Meal, Breakfast, Snack.',
    required: false,
    enum: MealCategory,
  })
  @IsEnum(MealCategory, {
    message: `meal_category must be one of the following values: ${Object.values(MealCategory).join(', ')}`,
  })
  @IsOptional()
  meal_category: MealCategory;

  @ApiProperty({
    example: 'category',
    description: 'Filter by category, recipe, or date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the value is not empty
  @IsEnum(FilterEnum, {
    message: 'Filter must be one of category, recipe, or date',
  }) // Validates against the enum
  filter: FilterEnum;

  @ApiProperty({
    required: false,
    example: 'meal_category', // Example search query
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
  // @IsIn(['1', '-1'], { message: 'Order must be 1 or -1' })
  order?: string;

  @ApiProperty({
    required: false,
    example: '674aba1851f3a3493e6f90a4', // Example search query
  })
  @IsOptional()
  @IsString()
  recipe_id?: string;

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
export class GetKitchenRecipeListDietTypeWiseDto {
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  @ApiProperty({
    example: '2025-01-06',
    description: 'Start date',
    required: true,
  })
  startDate: string;

  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  @ApiProperty({
    example: '2025-01-11',
    description: 'End date',
    required: true,
  })
  endDate: string;

  @IsString()
  @IsNotEmpty() // Ensures the value is not empty
  @IsEnum(FilterEnum, {
    message: 'Filter must be one of category, recipe, or date',
  }) // Validates against the enum
  @ApiProperty({
    example: 'date',
    description: 'Filter by category, recipe, or date',
    required: true,
  })
  filter: FilterEnum;

  @ApiProperty({
    required: false,
    example: 'dish_name', // Example search query
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
  order?: string;

  @ApiProperty({
    required: false,
    example: '674aba1851f3a3493e6f90a4', // Example search query
  })
  @IsOptional()
  @IsString()
  recipe_id?: string;

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

  @ApiProperty({
    required: false,
    example: 'balance', // Example limit
    description: 'Protein category',
  })
  @IsOptional()
  protein_category: string;
}
export class getKitchenRecipeRating {
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

  @ValidateIf(
    (value) => value === '' || Object.values(MealCategory).includes(value),
  )
  @IsIn(['', ...Object.values(MealCategory)], {
    message: `meal_category must be one of the following values: ${['', ...Object.values(MealCategory)].join(', ')}`,
  })
  @IsOptional()
  @ApiProperty({
    example: MealCategory.MEAL,
    description:
      'The category of the meal. Accepted values: Meal, Breakfast, Snack, or an empty string.',
    required: false,
    enum: MealCategory,
  })
  meal_category?: MealCategory | '';

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
    required: false,
    example: '674aba1851f3a3493e6f90a4', // Example search query
  })
  @IsOptional()
  @IsString()
  recipe_id?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    required: false,
    example: '674aba1851f3a3493e6f90a4', // Example search query
  })
  customer_id?: string;

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
