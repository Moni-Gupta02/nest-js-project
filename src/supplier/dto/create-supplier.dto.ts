import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  ArrayUnique,
} from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({
    example: 'ABC Suppliers',
    description: 'Company name of the supplier',
  })
  @IsNotEmpty({ message: 'Company must not be empty' })
  @IsString({ message: 'Company must be a string' })
  @MaxLength(100, { message: 'Company must be at most 100 characters long' })
  company: string;

  @ApiProperty({
    example: 'abc@example.com',
    description: 'Email address of the supplier',
  })
  @IsOptional()
  @IsString({ message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'First name of the supplier contact person',
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name must be at most 50 characters long' })
  first_name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the supplier contact person',
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name must be at most 50 characters long' })
  last_name: string;

  @ApiProperty({
    example: 'SUP123',
    description: 'Unique identifier for the supplier',
  })
  @IsOptional()
  @IsString({ message: 'Supplier ID must be a string' })
  @MaxLength(20, { message: 'Supplier ID must be at most 20 characters long' })
  supplier_id: string;

  @ApiProperty({
    example: ['veg', 'package_material'],
    description: 'Supplier types present for the supplier',
  })
  @IsOptional()
  @IsString({ each: true, message: 'Supplier type must be a string' })
  @ArrayUnique({ message: 'Supplier types must be unique' })
  supplier_type: string[];

  @ApiProperty({
    example: 1234567890,
    description: 'Mobile number of the supplier contact person',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Mobile number must be a number' })
  mobile_number: number;

  @ApiProperty({
    example: 9876543210,
    description: 'VAT number of the supplier',
  })
  @IsOptional()
  @IsNumber({}, { message: 'VAT number must be a number' })
  VAT_number: number;

  @ApiProperty({
    example: '123 Main Street',
    description: 'First line of the supplier address',
  })
  @IsOptional()
  @IsString({ message: 'Address1 must be a string' })
  @MaxLength(100, { message: 'Address1 must be at most 100 characters long' })
  address1: string;

  @ApiProperty({
    example: 'Apt 101',
    description: 'Second line of the supplier address',
  })
  @IsOptional()
  @IsString({ message: 'Address2 must be a string' })
  @MaxLength(100, { message: 'Address2 must be at most 100 characters long' })
  address2: string;

  @ApiProperty({
    example: 'This is a note about the supplier.',
    description: 'Additional notes or comments about the supplier',
  })
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must be at most 500 characters long' })
  @IsOptional()
  notes: string;
}

// Example usage:
// const supplierDto = new CreateSupplierDto();
// supplierDto.company = 'ABC Suppliers';
// supplierDto.email = 'abc@example.com';
// supplierDto.first_name = 'John';
// supplierDto.last_name = 'Doe';
// supplierDto.supplier_id = 'SUP123';
// supplierDto.supplier_type = ['veg', 'package_material'];
// supplierDto.mobile_number = 1234567890;
// supplierDto.VAT_number = 9876543210;
// supplierDto.address1 = '123 Main Street';
// supplierDto.address2 = 'Apt 101';
// supplierDto.notes = 'This is a note about the supplier.';
