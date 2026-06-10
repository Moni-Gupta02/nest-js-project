import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsArray,
  IsOptional,
  IsMongoId,
} from 'class-validator';

export class ExtendDeliveryDto {
  @ApiProperty({
    description: 'ID of the subscription to extend',
    example: '6756ce905347dbbde9758291',
  })
  @IsNotEmpty()
  @IsString()
  subscriptionId: string;

  @ApiProperty({
    description: 'Current end date of the subscription',
    example: '2025-01-17T00:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  subscriptionEndDate: string;

  @ApiProperty({
    description: 'Number of deliverable days (5 or 6)',
    example: 5,
  })
  @IsNotEmpty()
  @IsString()
  deliverableDays: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '6756cc755347dbbde97570ce',
  })
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsNotEmpty()
  @IsString()
  order_number: string;

  @ApiProperty({
    description: 'Order ID associated with the subscription',
    example: '6756ce565347dbbde975827b',
  })
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @ApiProperty({
    description: 'Length of ingredients to avoid',
    example: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  avoidIngredientsLength: number;
}

export class FreezeDeliveryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  customer_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  freeze_dates: string[];
}

export class UnfreezeDeliveryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  customer_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  restart_dates: string[];
}

export class AutoSelectionDeliveryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsMongoId()
  customer_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  restart_dates: string[];
}

export class FilterCitiesDto {
  @ApiPropertyOptional({ example: 'Dubai', description: 'City name filter' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Abu Hail',
    description: 'Area name filter',
  })
  @IsOptional()
  @IsString()
  area?: string;
}

export class ChangeDeliveryAddressDto {
  @ApiProperty({
    description:
      'Type of change (e.g., all, particular_date, week_day, start_from, date_range)',
    example: 'all',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Start date for changes',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  start_from?: string;

  @ApiProperty({
    description: 'Date range for changes',
    example: ['2024-01-01', '2024-01-07'],
    required: false,
  })
  @IsArray()
  @IsOptional()
  date_range?: string[];

  @ApiProperty({
    description: 'Address ID',
    example: '64b9c3b4e7e4d2156c22b234',
  })
  @IsNotEmpty()
  address_id: string;

  @ApiProperty({ description: 'Delivery slot', example: 'morning' })
  @IsString()
  @IsNotEmpty()
  slot: string;

  @ApiProperty({
    description: 'Weekday for specific changes',
    example: 'Monday',
    required: false,
  })
  @IsString()
  @IsOptional()
  week_day?: string;

  @ApiProperty({
    description: 'Delivery ID',
    example: '64b9c3b4e7e4d2156c22b234',
    required: false,
  })
  @IsOptional()
  delivery_id?: string;

  @ApiProperty({
    description: 'Subscription ID',
    example: '64b9c3b4e7e4d2156c22b234',
    required: false,
  })
  @IsOptional()
  subscription_id?: string;

  @ApiProperty({
    description: 'Customer ID',
    example: '64b9c3b4e7e4d2156c22b234',
  })
  @IsNotEmpty()
  customer_id: string;
}
