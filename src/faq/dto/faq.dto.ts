import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsMongoId } from 'class-validator';

export class CreateFAQDto {
  @ApiProperty({ type: [String], description: 'Array of FAQ category IDs' })
  @IsArray()
  @IsMongoId({ each: true })
  readonly category: string[]; // Array of ObjectIds

  @ApiProperty({ description: 'Question for the FAQ' })
  @IsString()
  readonly question: string;

  @ApiProperty({ description: 'Answer for the FAQ' })
  @IsString()
  readonly answer: string;

  @ApiProperty({ description: 'Order index for the FAQ' })
  @IsString()
  readonly order_index: string;
}

export class UpdateFAQDto {
  @ApiProperty({
    type: [String],
    description: 'Array of FAQ category IDs',
    required: false,
  })
  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  readonly category?: string[];

  @ApiProperty({ description: 'Question for the FAQ', required: false })
  @IsOptional()
  @IsString()
  readonly question?: string;

  @ApiProperty({ description: 'Answer for the FAQ', required: false })
  @IsOptional()
  @IsString()
  readonly answer?: string;

  @ApiProperty({ description: 'Order index for the FAQ', required: false })
  @IsOptional()
  @IsString()
  readonly order_index?: string;
}
