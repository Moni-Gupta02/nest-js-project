import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsOptional()
  mobile_number?: string;

  @ApiProperty({ example: '+971' })
  @IsString()
  @IsOptional()
  country_code?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'website' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty({ example: ['sales', 'support'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  type_of_query?: string[];

  @ApiProperty({ example: 'Interested in premium package' })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @IsOptional()
  created_by?: string;
}
