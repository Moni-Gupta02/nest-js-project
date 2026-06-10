import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

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

export class CompositionPortioningDTO {
  @IsMongoId()
  @ApiProperty({
    example: '663f136e0dc759494fcc1575',
    description: 'ID of the component',
  })
  component_id: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({ type: [PortioningBalance], description: 'List of portioning' })
  portioning_balance: PortioningBalance[];
}

export class UpdateRecipePortioningDto {
  @IsMongoId()
  @ApiProperty({
    example: '663f12ad0dc759494fcc156a',
    description: 'ID of the component',
  })
  recipe_id: any;

  @IsOptional()
  @IsString()
  @ApiProperty({
    example: 'chicken',
    description: 'protein type name',
  })
  protein_type: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    example: false,
    description: 'Is finalized Portioning?',
  })
  is_finalized?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ApiProperty({
    type: [CompositionPortioningDTO],
    description: 'List of compositions',
  })
  composition: CompositionPortioningDTO[];
}
