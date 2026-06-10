import { IsMongoId, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class orderHistoryDto {
  @ApiProperty({
    description: 'customer_id',
  })
  @IsMongoId()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    description: 'order_id',
  })
  @IsMongoId()
  @IsNotEmpty()
  order_id: string;
}
