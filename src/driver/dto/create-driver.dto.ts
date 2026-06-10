import { IsString, IsArray } from 'class-validator';
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
