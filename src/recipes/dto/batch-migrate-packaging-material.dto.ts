import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class BatchMigratePackagingMaterialDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one recipe ID is required' })
  @IsMongoId({ each: true, message: 'Each recipe ID must be a valid MongoDB ObjectId' })
  @ApiProperty({
    description: 'Array of recipe IDs to migrate',
    type: [String],
    example: [
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
    ],
    minItems: 1,
  })
  recipe_ids: string[];
}

