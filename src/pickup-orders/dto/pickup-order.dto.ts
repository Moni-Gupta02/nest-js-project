import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePickUpOrderDto {
  @ApiProperty({
    example: '19/12/2024',
    description: 'Pick-up date in DD/MM/YYYY format',
  })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({ example: 2, description: 'Number of bags to pick up' })
  @IsNotEmpty()
  @IsNumber()
  no_of_bag_to_pick: number;

  @ApiProperty({ example: '8AM - 6PM', description: 'Time slot for pick-up' })
  @IsNotEmpty()
  @IsString()
  slot: string;

  @ApiProperty({
    example: 'fefw, Al Faseel, Fujairah, United Arab Emirates',
    description: 'Pick-up address',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 'Al Faseel', description: 'Area for pick-up' })
  @IsNotEmpty()
  @IsString()
  area: string;

  @ApiProperty({ example: 'Fujairah', description: 'City for pick-up' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    example: 'United Arab Emirates',
    description: 'Country for pick-up',
  })
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ example: 'newwww a133', description: 'Customer name' })
  @IsNotEmpty()
  @IsString()
  customer_name: string;

  @ApiProperty({
    example: '+971 588878787',
    description: 'Customer mobile number',
  })
  @IsNotEmpty()
  @IsString()
  customer_mobile: string;

  @ApiProperty({
    example: '675fc1cdc38f1153d80d09ec',
    description: 'Customer ID',
  })
  @IsNotEmpty()
  @IsString()
  customer_id: string;
}
