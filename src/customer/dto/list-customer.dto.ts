import { Prop } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsArray, IsNotEmpty } from 'class-validator';

export class FindAllCustomersDto {
  @IsNotEmpty()
  @ApiProperty({ example: 0, description: 'Offset' })
  @Prop({ default: 0 })
  page: number;

  @IsNotEmpty()
  @ApiProperty({ example: 50, description: 'Limit' })
  @Prop({ default: 50 })
  limit: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '', description: 'Search String' })
  global?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ApiPropertyOptional({
    example: ['0', '1'],
    description: 'Total No. of orders',
  })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  no_of_items?: string[];

  @IsOptional()
  @ApiPropertyOptional({ example: 'subscription', description: 'Meal Plan' })
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'total_spent',
    description: 'Sort field',
    enum: ['total_spent', 'createdAt', 'total_orders'],
  })
  sort_by?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'desc',
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  sort_order?: 'asc' | 'desc';
}
