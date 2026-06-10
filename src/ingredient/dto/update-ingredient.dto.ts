import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class PackageDto {
  @ApiProperty({ example: 500, description: 'Size of the package in g' })
  @IsNumber({}, { message: 'Size must be a number' })
  @Min(0, { message: 'Size must be at least 0' })
  size: number;

  @ApiProperty({ example: 'g', description: 'Unit of the package' })
  @IsString({ message: 'Unit must be a string' })
  @IsNotEmpty({ message: 'Unit cannot be empty' })
  unit: string;

  @ApiProperty({ example: 5.99, description: 'Price of the package' })
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be at least 0' })
  price: number;

  @ApiProperty({ example: 5, description: 'Bulk number (for bulk package)' })
  @IsNumber({}, { message: 'Bulk number must be a number' })
  @Min(0, { message: 'Bulk number must be at least 0' })
  bulk_number?: number;

  @ApiProperty({
    example: false,
    description: 'Is single packege orderable?',
  })
  @IsBoolean({ message: 'single packege orderable must be a boolean' })
  @Min(0, { message: 'single packege orderable must be at least 0' })
  @IsNotEmpty({ message: 'Unit cannot be empty' })
  single_package_orderable?: boolean;
}
class NutritionDto {
  @ApiProperty({ example: 25, description: 'Protein per serving' })
  @IsNumber({}, { message: 'Protein must be a number' })
  @Min(0, { message: 'Protein must be at least 0' })
  protein: number;

  @ApiProperty({ example: 65, description: 'Carbohydrates per serving' })
  @IsNumber({}, { message: 'Carbohydrates must be a number' })
  @Min(0, { message: 'Carbohydrates must be at least 0' })
  carb: number;

  @ApiProperty({ example: 10, description: 'Fat per serving' })
  @IsNumber({}, { message: 'Fat must be a number' })
  @Min(0, { message: 'Fat must be at least 0' })
  fat: number;
}
class LanguageString {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'Hello', description: 'English text' })
  en?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: 'مرحبا', description: 'Arabic text' })
  ar?: string;

  [key: string]: string;
}
class SupplierDetailDto {
  @ApiProperty({
    example: '66260f4ce9b79c728c92a8a1',
    description: 'ID of the supplier',
  })
  @IsString({ message: 'Supplier ID must be a string' })
  @IsNotEmpty({ message: 'Supplier ID cannot be empty' })
  @IsMongoId({ message: 'Supplier ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  supplier: any;

  @ApiProperty({ example: '12345', description: 'Supplier article number' })
  @IsString({ message: 'Supplier article number must be a string' })
  // @IsNotEmpty({ message: 'Supplier article number cannot be empty' })
  @IsOptional()
  supplier_article: string;

  @ApiProperty({
    example: 'product_name',
    description: 'Product name',
  })
  @IsString({ message: 'Supplier product name must be a string' })
  product_name: string;

  @ApiProperty({ example: 1000, description: 'conversion ratio' })
  @IsNumber({}, { message: 'conversion ratio must be a number' })
  conversion_ratio: number;

  @ApiProperty({
    example: ['https://example.com/supplier-image.jpg'],
    description: 'Image URL of the product',
  })
  @IsString({ message: 'Image URL must be a string' })
  @IsNotEmpty({ message: 'Image URL cannot be empty' })
  image: string;

  @ApiProperty({
    example: { size: 500, unit: 'g', price: 5.99 },
    description: 'Details of single packages',
    type: PackageDto,
  })
  @ValidateNested({ each: true })
  @Min(1, {
    message: 'At least one single package detail is required',
  })
  @Min(5, {
    message: 'Maximum of five single package details allowed',
  })
  single_package: PackageDto;

  @ApiProperty({
    example: {
      size: 5000,
      unit: 'g',
      price: 39.99,
      bulk_number: 5,
      single_package_orderable: false,
    },
    description: 'Details of bulk packages',
    type: PackageDto,
  })
  @ValidateNested({ each: true })
  @IsOptional()
  @Min(1, { message: 'At least one bulk package detail is required' })
  @Min(6, { message: 'Maximum of five bulk package details allowed' })
  bulk_package: PackageDto;

  @ApiProperty({ example: true, description: 'Is the supplier active?' })
  @IsBoolean({ message: 'Active status must be a boolean' })
  is_active: boolean;
}

// export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {}
export class UpdateIngredientDto {
  @ApiProperty({
    example: 'Spaghetti',
    description: 'Name of the ingredient',
    required: false,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'Italian Pasta',
    description: 'Name of the product for customers',
    required: false,
  })
  @IsString({ message: 'Customer product name must be a string' })
  @IsNotEmpty({ message: 'Customer product name cannot be empty' })
  @IsOptional()
  name_of_customers?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageString)
  @ApiProperty({
    type: LanguageString,
    example: {
      en: 'Grilled Chicken',
      ar: 'دجاج مشوي',
    },
    description: 'Multilingual dish name',
  })
  name_of_customers_tl: LanguageString;

  @ApiProperty({
    example: ['6469b9c0cdcbcc456c3d96d3', '6469b8a8cdcbcc456c3d966b'],
    description: 'Types of category',
  })
  @IsString({ each: true, message: 'category type must be a string' })
  @IsOptional()
  // @ArrayUnique({ message: 'Types must be unique' })
  category: string[];

  @IsString({ message: 'Supplier ID must be a string' })
  @IsNotEmpty({ message: 'Supplier ID cannot be empty' })
  @IsMongoId({ message: 'Supplier ID must be a valid MongoDB ObjectId' })
  @IsOptional()
  supplier: any;

  @ApiProperty({
    example: 'Dry storage',
    description: 'Storage location of the ingredient',
    required: false,
  })
  @IsString({ message: 'Storage location must be a string' })
  @IsOptional()
  storage_location?: string;

  @ApiProperty({
    example: 'Ingredient type',
    description: 'Ingredient type of the ingredient',
  })
  @IsString({ message: 'Ingredient type must be a string' })
  @IsOptional()
  ingredient_type: string;

  @ApiProperty({
    example: 365,
    description: 'Shelf life in days',
    required: false,
  })
  @IsNumber({}, { message: 'Shelf life must be a number' })
  @IsOptional()
  shelf_life?: number;

  @ApiProperty({
    example: 'days',
    description: 'units for shelf life',
    required: false,
  })
  @IsString({ message: 'shelf life units must be a string' })
  @IsOptional()
  shelf_life_unit?: string;

  @ApiProperty({ example: 5, description: 'Waste percentage', required: false })
  @IsNumber({}, { message: 'Waste percentage must be a number' })
  @IsOptional()
  waste?: number;

  @ApiProperty({
    example: 'g',
    description: 'Unit of measurement',
    required: false,
  })
  @IsString({ message: 'Unit of measurement must be a string' })
  @IsOptional()
  unit_of_measurement?: string;

  @ApiProperty({
    example: false,
    description: 'Is the ingredient sold by weight?',
    required: false,
  })
  @IsBoolean({ message: 'Weighted status must be a boolean' })
  @IsOptional()
  is_weighted?: boolean;

  @ApiProperty({
    example: false,
    description: 'Is the ingredient sold per piece?',
    required: false,
  })
  @IsBoolean({ message: 'Piece status must be a boolean' })
  @IsOptional()
  is_piece?: boolean;

  @ApiProperty({
    example: 'Bag',
    description: 'Type of packaging',
    required: false,
  })
  @IsString({ message: 'Package type must be a string' })
  @IsOptional()
  package_type?: string;

  @ApiProperty({
    type: NutritionDto,
    description: 'Nutritional information per serving',
    required: false,
  })
  @ValidateNested()
  @IsOptional()
  nutrition?: NutritionDto;

  @ApiProperty({
    example: true,
    description: 'Is the ingredient active?',
    required: false,
  })
  @IsBoolean({ message: 'Active status must be a boolean' })
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({
    example: ['6469b9c0cdcbcc456c3d96d3', '6469b8a8cdcbcc456c3d966b'],
    description: 'Types of diets suitable for the ingredient',
  })
  @IsString({ each: true, message: 'Diet type must be a string' })
  @ArrayUnique({ message: 'Diet types must be unique' })
  // @ArrayMinSize(1, { message: 'At least one diet type is required' })
  @IsOptional()
  diet_type: string[]; // Dynamic key-value pairs

  @ApiProperty({
    example: ['Gluten', 'Dairy'],
    description: 'Allergens present in the ingredient',
  })
  @IsString({ each: true, message: 'Allergen must be a string' })
  @ArrayUnique({ message: 'Allergens must be unique' })
  @IsOptional()
  allergens: string[];

  @ApiProperty({
    description: 'Details of suppliers for the ingredient',
    type: [SupplierDetailDto],
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'At least one supplier detail is required' })
  @IsOptional()
  supplier_details: SupplierDetailDto[];

  @ApiProperty({
    example: true,
    description: 'Show ingredient to customers?',
    required: false,
  })
  @IsBoolean({ message: 'Show to customers status must be a boolean' })
  @IsOptional()
  show_customers?: boolean;
}
