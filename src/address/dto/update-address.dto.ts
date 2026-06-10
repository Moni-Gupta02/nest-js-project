import { IsString, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({
    example: 'Home',
    description: 'Type of the address (e.g., Home, Work)',
  })
  @IsString()
  address_type: string;

  @ApiProperty({
    example: 'testhome',
    description: 'Full address',
  })
  @IsString()
  full_address: string;

  @ApiProperty({
    example: 'Abu Dhabi',
    description: 'City of the address',
  })
  @IsString()
  city: string;

  @ApiProperty({
    example: 'Madinat Zayed',
    description: 'Province of the address',
  })
  @IsString()
  province: string;

  @ApiProperty({
    example: 'United Arab Emirates',
    description: 'Country of the address',
  })
  @IsString()
  country: string;

  @ApiProperty({
    example: false,
    description: 'Whether the address is the default address',
  })
  @IsBoolean()
  is_default: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the address is active',
  })
  @IsBoolean()
  is_active: boolean;

  @ApiProperty({
    example: 'test note',
    description: 'Delivery note for the address',
  })
  @IsString()
  @IsOptional()
  delivery_note?: string;

  @ApiProperty({
    example: '64b1c28d5f3d9a001c5e12d7',
    description: 'Customer ID',
  })
  @IsString()
  customer_id: string;
}
export class CustomerAddressDeleteDto {
  @ApiProperty({
    example: '64b1c28d5f3d9a001c5e12a3',
    description: 'Old address ID',
  })
  @IsString()
  old_address_id: string;

  @ApiProperty({
    example: '64b1c28d5f3d9a001c5e12b4',
    description: 'New address ID',
  })
  @IsString()
  new_address_id: string;

  @ApiProperty({
    example: '12:00 PM - 2:00 PM',
    description: 'Slot for the new address',
  })
  @IsString()
  slot: string;

  @ApiProperty({
    example: '64b1c28d5f3d9a001c5e12d7',
    description: 'Customer ID',
  })
  @IsString()
  @IsMongoId()
  customer_id: string;
}
