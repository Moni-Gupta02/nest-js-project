// import { ApiProperty } from '@nestjs/swagger';
// import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

// class SupplierDetailsDto {
//   @ApiProperty({ example: 'Product Name' })
//   product_name: string;

//   @ApiProperty({
//     example: '66260f4ce9b79c728c92a8a1',
//     description: 'ID of the supplier',
//   })
//   @IsString({ message: 'Supplier ID must be a string' })
//   @IsNotEmpty({ message: 'Supplier ID cannot be empty' })
//   @IsMongoId({ message: 'Supplier ID must be a valid MongoDB ObjectId' })
//   supplier: any;

//   @ApiProperty({ example: 1 })
//   supplier_pref: number;

//   @ApiProperty({ example: { size: 10, unit: 'kg', price: 20 } })
//   single_package: {
//     size: number;
//     unit: string;
//     price: number;
//   };

//   @ApiProperty({
//     example: {
//       size: 100,
//       unit: 'kg',
//       price: 150,
//       bulk_number: 5,
//       single_package_orderable: true,
//     },
//   })
//   bulk_package: {
//     size: number;
//     unit: string;
//     price: number;
//     bulk_number: number;
//     single_package_orderable: boolean;
//   };

//   @ApiProperty({ example: true })
//   is_active: boolean;
// }

// export class CreatePackagingMaterialDto {
//   @ApiProperty({ example: 'General Name' })
//   name: string;

//   @ApiProperty({ example: 'General Type' })
//   type: string;

//   @ApiProperty({ example: 'General Note' })
//   note: string;

//   @ApiProperty({ type: [SupplierDetailsDto] })
//   supplier_details: SupplierDetailsDto[];

//   @ApiProperty({ example: true })
//   is_active: boolean;
//   static supplier_details: any;
// }
import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class SinglePackage {
  @IsNumber({}, { message: 'Size must be a number' })
  size: number;

  @IsString({ message: 'Unit must be a string' })
  unit: string;

  @IsNumber({}, { message: 'Price must be a number' })
  price: number;
}

class BulkPackage {
  @IsNumber({}, { message: 'Size must be a number' })
  size: number;

  @IsString({ message: 'Unit must be a string' })
  unit: string;

  @IsNumber({}, { message: 'Price must be a number' })
  price: number;

  @IsNumber({}, { message: 'Bulk number must be a number' })
  bulk_number: number;

  @IsBoolean({ message: 'Single package orderable must be a boolean' })
  single_package_orderable: boolean;
}

class SupplierDetailsDto {
  @ApiProperty({ example: 'Product Name' })
  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name cannot be empty' })
  product_name: string;

  @ApiProperty({
    example: '66260f4ce9b79c728c92a8a1',
    description: 'ID of the supplier',
  })
  @IsString({ message: 'Supplier ID must be a string' })
  @IsNotEmpty({ message: 'Supplier ID cannot be empty' })
  @IsMongoId({ message: 'Supplier ID must be a valid MongoDB ObjectId' })
  supplier: string;

  @ApiProperty({ example: 1 })
  @IsNumber({}, { message: 'Supplier preference must be a number' })
  supplier_pref: number;

  @ApiProperty({ example: { size: 10, unit: 'kg', price: 20 } })
  @ValidateNested()
  @Type(() => SinglePackage)
  single_package: SinglePackage;

  @ApiProperty({
    example: {
      size: 100,
      unit: 'kg',
      price: 150,
      bulk_number: 5,
      single_package_orderable: true,
    },
  })
  @ValidateNested()
  @Type(() => BulkPackage)
  bulk_package: BulkPackage;

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active: boolean;
}

export class CreatePackagingMaterialDto {
  @ApiProperty({ example: 'General Name' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name: string;

  @ApiProperty({ example: 'General Type' })
  @IsString({ message: 'Type must be a string' })
  @IsNotEmpty({ message: 'Type cannot be empty' })
  type: string;

  @ApiProperty({ example: 'General Note' })
  @IsString({ message: 'Note must be a string' })
  note: string;

  @ApiProperty({ type: [SupplierDetailsDto] })
  @ValidateNested({ each: true })
  @Type(() => SupplierDetailsDto)
  supplier_details: SupplierDetailsDto[];

  @ApiProperty({ example: true })
  @IsBoolean({ message: 'is_active must be a boolean' })
  is_active: boolean;
}
export class FindPackagingMaterialDto {
  @ApiProperty({
    description: 'Array of PackagingMaterial IDs to find',
    example: ['comp123', 'comp456', 'comp789'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  packaging_material_ids: string[];
}
