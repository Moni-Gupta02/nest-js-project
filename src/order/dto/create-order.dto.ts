import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
export class CreateOrderDto {}

export class ChangeCalorieRangeDto {
  @ApiProperty({ example: '6756cddb5347dbbde9757798', description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({
    example: '6756ce1a5347dbbde9757e55',
    description: 'Subscription ID',
  })
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({ example: 'Medium', description: 'Calorie Range' })
  @IsString()
  @IsNotEmpty()
  kcal_range: string;

  @ApiProperty({ example: '550 - 600 Kcal', description: 'Calorie Value' })
  @IsString()
  @IsNotEmpty()
  kcal: string;

  @ApiProperty({ example: '12/12/2024', description: 'Start Date' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '12/12/2024', description: 'End Date' })
  @IsString()
  @IsNotEmpty()
  endDate: string;
}
