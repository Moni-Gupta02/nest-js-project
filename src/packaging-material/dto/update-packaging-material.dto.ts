import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

class SupplierDetailsDto {
  @ApiProperty({ example: 'Product Name' })
  product_name: string;

  @ApiProperty({
    example: '66260f4ce9b79c728c92a8a1',
    description: 'ID of the supplier',
  })
  @IsString({ message: 'Supplier ID must be a string' })
  @IsNotEmpty({ message: 'Supplier ID cannot be empty' })
  @IsMongoId({ message: 'Supplier ID must be a valid MongoDB ObjectId' })
  supplier: any;

  @ApiProperty({ example: 1 })
  supplier_pref: number;

  @ApiProperty({ example: { size: 10, unit: 'kg', price: 20 } })
  single_package: {
    size: number;
    unit: string;
    price: number;
  };

  @ApiProperty({
    example: {
      size: 100,
      unit: 'kg',
      price: 150,
      bulk_number: 5,
      single_package_orderable: true,
    },
  })
  bulk_package: {
    size: number;
    unit: string;
    price: number;
    bulk_number: number;
    single_package_orderable: boolean;
  };

  @ApiProperty({ example: true })
  is_active: boolean;
}

export class UpdatePackagingMaterialDto {
  @ApiProperty({ example: 'General Name' })
  name: string;

  @ApiProperty({ example: 'General Type' })
  type: string;

  @ApiProperty({ example: 'General Note' })
  note: string;

  @ApiProperty({ type: [SupplierDetailsDto] })
  supplier_details: SupplierDetailsDto[];

  @ApiProperty({ example: true })
  is_active: boolean;
  static supplier_details: any;
}
