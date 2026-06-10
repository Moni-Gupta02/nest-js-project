import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsMongoId,
} from 'class-validator';

export class AddSaturdayDeliveryDto {
  @ApiProperty({
    description: 'Customer id for which Saturday delivery is added',
    example: '6756cc755347dbbde97570ce',
  })
  @IsMongoId()
  customer_id: string;

  @ApiProperty({
    description: 'Order id for which Saturday delivery is added',
    example: '6756ce565347dbbde975827b',
  })
  @IsMongoId()
  order_id: string;

  @ApiProperty({
    description: 'Subscription id for which Saturday delivery is added',
    example: '6756ce905347dbbde9758291',
  })
  @IsMongoId()
  subscription_id: string;

  @ApiProperty({
    description:
      'Delivery dates (each must be a Saturday). Pass a single date as a one-element array.',
    example: ['2026-06-06T00:00:00.000Z', '2026-06-13T00:00:00.000Z'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({}, { each: true })
  delivery_dates: string[];
}
