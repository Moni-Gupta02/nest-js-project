import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DriverBarcodeQueryDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2026-01-13',
  })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ['Batch1', 'MP', 'NDD'], example: 'Batch1' })
  @IsEnum(['Batch1', 'MP', 'NDD'])
  phase: 'Batch1' | 'MP' | 'NDD';

  @ApiProperty({ enum: ['customer', 'item'], example: 'customer' })
  @IsEnum(['customer', 'item'])
  type: 'customer' | 'item';
}
