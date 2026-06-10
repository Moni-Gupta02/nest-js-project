import { IsString, IsArray, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeliverySlotDto {
  @ApiProperty({ example: 'New York' })
  @IsString()
  city_name: string;

  @ApiProperty({
    example: [{ timing: '08:00-10:00' }],
  })
  @IsArray()
  slot_list: Array<{ timing: string }>;

  @ApiProperty({ example: ['Area 1', 'Area 2'] })
  @IsArray()
  area_list: string[];
}

export class UpdateDeliverySlotDto extends CreateDeliverySlotDto {}

export class CreateVehicleDto {
  @IsString()
  vehicle_number: string;
}

export class UpdateVehicleDto {
  @IsString()
  vehicle_number: string;
}

export enum BarcodePhase {
  BATCH1 = 'Batch1',
  NDD = 'NDD',
}

export class GetBarcodeReportDto {
  @ApiProperty({
    example: '2024-01-15',
    description: 'Delivery date in YYYY-MM-DD format',
  })
  @IsDateString()
  date: string;
}
