import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindAllAddressesDto {
  @ApiPropertyOptional({ example: 'Home', description: 'Address Type' })
  @IsOptional()
  @IsString()
  address_type?: string;

  @ApiPropertyOptional({ example: 'Dubai', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page',
    default: 10,
  })
  @IsOptional()
  limit?: number;
}
