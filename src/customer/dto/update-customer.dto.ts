import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateCustomerDto {
  @ApiProperty({ example: 'John', description: 'First Name of the customer' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ example: 'Doe', description: 'Last Name of the customer' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email of the customer',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+971501234567',
    description: 'Phone number of the customer',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiProperty({
    example: '+971551234567',
    description: 'WhatsApp number of the customer',
  })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiProperty({
    example: 'Customer called for refund',
    description: 'A single note to be added to internal notes',
  })
  @IsOptional()
  @IsString()
  internal_notes?: string; // Accepts a single string note
}
