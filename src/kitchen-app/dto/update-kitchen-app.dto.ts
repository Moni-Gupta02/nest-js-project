import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRecipePortionDto, Variants } from './create-kitchen-app.dto';

export class UpdateRecipePortionDto extends PartialType(
  CreateRecipePortionDto,
) {
  @ApiProperty({
    example: '66543927428e28b071de0aaf',
    description: 'Recipe ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  recipe_id?: string;

  @ApiProperty({
    type: [Variants],
    description: 'Array of variants',
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Variants)
  @IsOptional()
  variants?: Variants[];
}
