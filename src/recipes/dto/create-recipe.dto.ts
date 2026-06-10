import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

enum RecipeType {
  RECIPE = 'recipe',
}

// class CuisineDTO {
//   @IsMongoId()
//   @ApiProperty({
//     example: '6115fc1ea6770e4a6b8cf63f',
//     description: 'ID of the cuisine',
//   })
//   id: string;
// }
enum portioningCategory {
  LOW = 'low',
  BALANCE = 'balance',
  HIGH = 'high',
  VEGETARIAN = 'vegetarian',
  PCOS = 'pcos',
  DIABETES = 'diabetes',
  SMART_SAVER = 'smart_saver',
}

class PlattingMethod {
  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 1, description: 'Recipe step details' })
  step: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'step1 instruction', description: 'Outcome details' })
  outcome: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: ['https://example.com/image.jpg'],
    description: 'URL of the final dish image',
  })
  image?: [];

  // @IsOptional()
  // @IsEnum(portioningCategory)
  // @ApiProperty({
  //   example: 'balance',
  //   enum: portioningCategory,
  //   description: 'Category of the plating method',
  // })
  // category?: portioningCategory;
}
class portioning {
  protein_type: string;
  image: string[];
  // protein_category: {
  //   enum: portioningCategory;
  //   default: portioningCategory.BALANCE;
  // };
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
export class ProteinCategory {
  @IsEnum(portioningCategory)
  @ApiProperty({
    example: portioningCategory.BALANCE,
    enum: portioningCategory,
    description: 'Protein category (portioningCategory)',
  })
  category: portioningCategory;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Scrambled eggs', description: 'Name of the dish' })
  dish_name: string;

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
  dish_name_tl: LanguageString;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Delicious breakfast dish',
    description: 'Description of the recipe',
  })
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageString)
  @ApiProperty({
    type: LanguageString,
    example: {
      en: 'Delicious grilled chicken with balanced protein.',
      ar: 'دجاج مشوي لذيذ مع بروتين متوازن',
    },
    description: 'Multilingual description of the protein category',
  })
  description_tl: LanguageString;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Delicious grilled chicken with balanced protein.',
    description: 'Description of the plating_instruction',
  })
  plating_instruction: string;
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Delicious grilled chicken with balanced protein.',
    description: 'Description of the label_instruction',
  })
  label_instruction: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Images related to the protein category',
  })
  image: string[];

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: [
      {
        url: 'rms-staging/TestProductImages/thumbnails/small/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_small.jpg ',
        type: 'thumbnail',
        size: 'small',
      },
      {
        url: 'rms-staging/TestProductImages/thumbnails/banner/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_banner.jpg',
        type: 'thumbnail',
        size: 'banner',
      },
      {
        url: 'rms-staging/TestProductImages/original/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_original.png',
        type: 'original',
      },
      {
        url: 'rms-staging/TestProductImages/compressed/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_compressed.jpg',
        type: 'compressed',
      },
    ],
    description: 'URL of the dish image variants',
  })
  image_variants?: [];

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Images related to the protein category',
  })
  internal_image: string[];

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: [
      {
        url: 'rms-staging/TestProductImages/thumbnails/small/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_small.jpg ',
        type: 'thumbnail',
        size: 'small',
      },
      {
        url: 'rms-staging/TestProductImages/thumbnails/banner/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_banner.jpg',
        type: 'thumbnail',
        size: 'banner',
      },
      {
        url: 'rms-staging/TestProductImages/original/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_original.png',
        type: 'original',
      },
      {
        url: 'rms-staging/TestProductImages/compressed/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_compressed.jpg',
        type: 'compressed',
      },
    ],
    description: 'URL of the dish image variants',
  })
  internal_image_variants?: [];

  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: [portioning],
    description: 'List of portioning methods grouped by category',
  })
  portioning: portioning[];

  @IsOptional()
  @IsArray()
  @ApiProperty({
    type: [PlattingMethod],
    description: 'List of plating methods grouped by category',
  })
  platting_method: PlattingMethod[];

  @IsEnum(portioningCategory)
  @ApiProperty({
    example: portioningCategory.BALANCE,
    enum: portioningCategory,
    description: 'Highly recommendation diet type',
  })
  recommendation: portioningCategory;
}

class DishTypeDTO {
  @IsMongoId()
  @ApiProperty({
    example: '6115fc1ea6770e4a6b8cf63f',
    description: 'ID of the dish type',
  })
  id: string;
}

class CookingMethod {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'step1', description: 'recipe step details' })
  step: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'step1 outcome', description: 'Outcome details' })
  outcome: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: ['https://example.com/image.jpg'],
    description: 'URL of the final dish image',
  })
  image?: [];
}

class PortioningBalance {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'small',
    description: 'size of Protein',
  })
  type?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'chicken',
    description: 'protein type name',
  })
  protein_type: string;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'price' })
  price: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'carb' })
  carb: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'kcal' })
  kcal: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'fat' })
  fat: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'protein' })
  protein: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Is finalized Portioning?',
  })
  is_finalized?: boolean;
}
// class CompositionInnerDTO {
//   @IsMongoId()
//   @ApiProperty({
//     example: '6115fc1ea6770e4a6b8cf63f',
//     description: 'ID of the component',
//   })
//   component_id: any;

//   @IsOptional()
//   @IsString()
//   @ApiProperty({ example: 'carb', description: 'Type of composition' })
//   type: string;

//   @IsOptional()
//   @IsString()
//   @ApiProperty({ example: '100', description: 'Small description' })
//   small: number;

//   @IsOptional()
//   @IsString()
//   @ApiProperty({ example: '150', description: 'Medium description' })
//   medium: number;

//   @IsOptional()
//   @IsString()
//   @ApiProperty({ example: '200', description: 'Large description' })
//   large: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '200', description: 'Small price' })
//   // price_small: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '250', description: 'Large price' })
//   // price_large: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '200', description: 'Small kcal' })
//   // kcal_small: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '200', description: 'Large kcal' })
//   // kcal_large: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '200', description: 'carb' })
//   // carb: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '200', description: 'fat' })
//   // fat: number;

//   // @IsOptional()
//   // @IsNumber()
//   // @ApiProperty({ example: '200', description: 'protein' })
//   // protein: number;

//   @IsOptional()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @ApiProperty({ type: [PortioningBalance], description: 'List of portioning' })
//   portioning_balance: PortioningBalance[];
// }
class CompositionDTO {
  // @IsOptional()
  // @IsArray()
  // @ValidateNested({ each: true })
  // @ApiProperty({
  //   type: [CompositionInnerDTO],
  //   description: 'List of CompositionSubDTO',
  // })
  // component: CompositionInnerDTO[];
  @IsMongoId()
  @ApiProperty({
    example: '6115fc1ea6770e4a6b8cf63f',
    description: 'ID of the component',
  })
  component_id: any;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'carb', description: 'Type of composition' })
  type: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '100', description: 'Small description' })
  small: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '150', description: 'Medium description' })
  medium: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '200', description: 'Large description' })
  large: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [PortioningBalance], description: 'List of portioning' })
  portioning_balance: PortioningBalance[];

  @IsOptional()
  @IsMongoId()
  @ApiProperty({
    example: '6115fc1ea6770e4a6b8cf63f',
    description: 'ID of the packaging material',
  })
  packaging_material: any;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Is this Main Container',
  })
  is_main?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Is this in side the Main Container',
  })
  is_inside?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Is this seperate Container',
  })
  is_separate?: boolean;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'label', description: 'label of package material' })
  label?: string;
}

export class CreateRecipeDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Scrambled eggs', description: 'Name of the dish' })
  dish_name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Breakfast', description: 'Meal category' })
  meal_category: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Subscription', description: 'Category type' })
  category_type?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'Delicious breakfast dish',
    description: 'Description of the recipe',
  })
  description?: string;

  // @IsOptional()
  // @IsArray()
  // @ArrayMinSize(1, {
  //   message: 'At least one Day of the month detail is required',
  // })
  // @ApiProperty({ example: [1, 2, 3], description: 'Day of the month' })
  // day_of_month?: number[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Object where keys are cuisine ID',
    example: '649bea7ce8faa3bfd7d48869',
  })
  cuisine: string;

  @IsOptional()
  @ApiProperty({
    example: 'high',
    description: 'ID of the spice level',
  })
  spice_level: string;

  @IsOptional()
  @ApiProperty({
    example: 'high',
    description: 'ID of the cooking complexity',
  })
  cooking_complexity: string;

  @IsOptional()
  @ApiProperty({
    example: 'high',
    description: 'ID of the plating complexity',
  })
  plating_complexity: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'Whether the recipe is highly perishable',
  })
  highly_perishable?: boolean;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: [
      'rms-staging/dishes/29-11-2024_11-22-31_9340954d-a9b6-467b-abb8-8394924902af.jpeg',
    ],
    description: 'URL of the final dish image',
  })
  final_dish_image?: [];

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: [
      {
        url: 'rms-staging/TestProductImages/thumbnails/small/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_small.jpg ',
        type: 'thumbnail',
        size: 'small',
      },
      {
        url: 'rms-staging/TestProductImages/thumbnails/banner/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_banner.jpg',
        type: 'thumbnail',
        size: 'banner',
      },
      {
        url: 'rms-staging/TestProductImages/original/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_original.png',
        type: 'original',
      },
      {
        url: 'rms-staging/TestProductImages/compressed/03-09-2025_12-02-04_523ca1b1-3fd3-4ea8-9508-25a62bb52403_compressed.jpg',
        type: 'compressed',
      },
    ],
    description: 'URL of the dish image variants',
  })
  final_dish_image_variants?: [];

  @IsEnum(RecipeType)
  @IsOptional()
  @ApiProperty({
    enum: RecipeType,
    example: 'recipe',
    description: 'Type of recipe',
  })
  recipe_type?: string = RecipeType.RECIPE;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one dish types detail is required' })
  @ApiProperty({
    type: [DishTypeDTO],
    description: 'List of dish types',
    example: ['649bea7ce8faa3bfd7d48869'],
  })
  dish_type: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [CompositionDTO], description: 'List of compositions' })
  composition: CompositionDTO[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [CookingMethod], description: 'List of Cooking Method' })
  cooking_method: CookingMethod[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({
    type: [ProteinCategory],
    description: 'Details for each protein category',
  })
  protein_category: ProteinCategory[];

  @IsOptional()
  @IsNumber()
  @ApiProperty({
    example: 1,
    description: 'Recipe phase (1 or 2)',
    enum: [1, 2],
  })
  phase?: number;
}
