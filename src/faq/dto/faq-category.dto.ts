import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateFAQCategoryDto {
  @ApiProperty({ description: 'Name of the FAQ category' })
  @IsString()
  readonly name: string;
}

export class UpdateFAQCategoryDto {
  @ApiProperty({ description: 'Name of the FAQ category', required: false })
  @IsOptional()
  @IsString()
  readonly name?: string;

  @ApiProperty({
    description: 'Order index for the FAQ category',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly order_index?: string;
}
