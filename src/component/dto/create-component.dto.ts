import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

enum ComponentType {
  SUB_RECIPE = 'sub-recipe',
  COMPONENT = 'component',
}
enum compositionType {
  INGREDIENT = 'ingredient',
  SUB_RECIPE = 'sub-recipe',
  // COmponent = 'component',
}
class CompositionInnerSubDTO {
  @IsEnum(compositionType)
  @IsNotEmpty()
  @ApiProperty({
    enum: compositionType,
    example: 'sub-recipe',
    description: 'Type of recipe',
  })
  composition_type?: string = compositionType.SUB_RECIPE;

  @IsMongoId()
  @ApiProperty({
    example: '6115fc1ea6770e4a6b8cf63f',
    description: 'ID of the component',
  })
  ingredient_id: string;

  @IsMongoId()
  @ApiProperty({
    example: '6115fc1ea6770e4a6b8cf63f',
    description: 'ID of the component',
  })
  component_id: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '100', description: 'net Quantity' })
  net_qty: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'g', description: 'unit' })
  unit: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '10', description: 'waste' })
  waste: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'peice', description: 'cutting_style' })
  cutting_style: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'remark note', description: 'remark' })
  remark: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: 'Ingredient needs preparation',
    description: 'mise_en_plaxe',
  })
  mise_en_place: boolean;

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
  @ApiProperty({ example: '200', description: 'pro' })
  pro: number;
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

export class CreateComponentDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Scrambled eggs', description: 'Name of the dish' })
  name: string;

  @IsOptional()
  @ApiProperty({
    example: 'high',
    description: 'ID of the cooking complexity',
  })
  cooking_complexity: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'Whether the recipe is highly perishable',
  })
  highly_perishable?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'Whether the recipe is usable for other',
  })
  useblefor_other?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'can be recipe is frozen',
  })
  is_frozen?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'can be recipe is stockable',
  })
  stockable?: boolean;

  // @ApiProperty({ example: 365, description: 'Shelf life in days' })
  // @IsNumber(
  //   {},
  //   {
  //     message: (validationArguments: ValidationArguments) => {
  //       return `${validationArguments.property}:Shelf life must be a number`;
  //     },
  //   },
  // )
  // @IsOptional()
  // shelf_life: number;

  // @ApiProperty({
  //   example: 'days',
  //   description: 'units for shelf life',
  //   required: false,
  // })
  // @IsString({ message: 'shelf life units must be a string' })
  // @IsOptional()
  // shelf_life_unit?: string;

  @IsOptional()
  @IsArray()
  @ApiProperty({
    example: ['https://example.com/image.jpg'],
    description: 'URL of the final dish image',
  })
  final_dish_image?: [];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({
    type: [CompositionInnerSubDTO],
    description: 'List of compositions',
  })
  composition: CompositionInnerSubDTO[];

  @IsEnum(ComponentType)
  @IsNotEmpty()
  @ApiProperty({
    enum: ComponentType,
    example: 'component',
    description: 'Type of recipe',
  })
  recipe_type?: string = ComponentType.COMPONENT;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
  })
  use_calculated_weight?: boolean;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'calculated_weight' })
  calculated_weight: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: '200', description: 'manual_weight' })
  manual_weight: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [CookingMethod], description: 'List of Cooking Method' })
  cooking_method: CookingMethod[];
}
export class FindComponentDto {
  @ApiProperty({
    description: 'Array of component IDs to find',
    example: ['comp123', 'comp456', 'comp789'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  component_ids: string[];
}

export class DuplicateComponentDTO {
  @IsNotEmpty()
  @IsMongoId()
  @ApiProperty({
    example: '6653448c4619e77f0da2f42d',
    description: '_id of composition/subrecipe',
  })
  id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'sub-recipe', description: 'type of composition' })
  recipe_type: string;
}
