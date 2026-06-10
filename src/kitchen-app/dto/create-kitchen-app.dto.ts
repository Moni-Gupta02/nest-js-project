import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class Variants {
  @ApiProperty({ example: 'Chicken', description: 'Type of protein option' })
  @IsString()
  @IsNotEmpty()
  protein_option: string;

  @ApiProperty({ example: 'medium', description: 'Size of the variant' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 2, description: 'Count of the variant' })
  @IsNumber()
  @IsNotEmpty()
  count: number;
  net_qty: number;

  @ApiProperty({
    example: 'balance',
    description: 'protein_category of the variant',
  })
  @IsString()
  protein_category: string = 'balance';
}

export class CreateRecipePortionDto {
  @ApiProperty({
    example: '665335b74619e77f0da2f342',
    description: 'Recipe ID',
  })
  @IsString()
  @IsNotEmpty()
  recipe_id: string;

  @ApiProperty({ type: [Variants], description: 'Array of variants' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Variants)
  variants: Variants[];

  @ApiProperty({
    example: '01/07/2024',
    description: 'Recipe Date',
  })
  @IsString()
  @IsNotEmpty()
  date: string;
}
