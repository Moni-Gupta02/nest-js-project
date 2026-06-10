import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsMongoId,
  IsBoolean,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    example: '611d1ad6f3a3e9b728c8c7b7',
    description: 'Customer ID',
  })
  @IsOptional()
  @IsMongoId()
  customer_id: string;

  @ApiProperty({
    example: 'Home',
    description: 'Address Type',
    required: false,
  })
  @IsOptional()
  @IsString()
  address_type?: string;

  @ApiProperty({
    example: '123 Main Street, Apt 4B',
    description: 'Full address',
  })
  @IsOptional()
  @IsString()
  full_address?: string;

  @ApiProperty({ example: 'Dubai', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Dubai', description: 'Province' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    example: 'United Arab Emirates',
    description: 'Country',
    default: 'United Arab Emirates',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 25.276987, description: 'Latitude', required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    example: 55.296249,
    description: 'Longitude',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    example: 'Leave at the front door',
    description: 'Delivery Note',
    required: false,
  })
  @IsOptional()
  @IsString()
  delivery_note?: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  is_default: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  is_active: boolean;
}
