import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetOrdersDto {
  @ApiProperty({
    description: 'Type of the order (e.g., subscription, ndd)',
    example: 'subscription',
  })
  @IsString()
  @IsNotEmpty()
  orderType: string;

  @ApiPropertyOptional({
    description: 'Type of the Goals (e.g., pcos, weight_loss)',
    example: 'pcos',
  })
  @IsOptional()
  @IsString()
  goalType: string;

  @ApiProperty({
    description: 'Start date for filtering orders',
    example: '2024-01-01',
  })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date for filtering orders',
    example: '2024-01-31',
  })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Order status for filtering (e.g., Completed, Failed)',
    example: 'Completed',
  })
  @IsOptional()
  @IsString()
  orderStatus?: string;
  @ApiPropertyOptional({
    description: 'Renewal status of the order',
    example: 're-new',
  })
  @IsOptional()
  @IsString()
  renewal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    example: 0,
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dietType?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: [
      'createdAt',
      'order_number',
      'final_order_total',
      'delivery_start_date',
      'customer_full_name',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Filter by delivery day duration (e.g., "6", "20", "60")',
    example: '20',
  })
  @IsOptional()
  @IsString()
  deliveryDays?: string;

  @ApiPropertyOptional({
    description: 'Filter by plan duration in days',
    example: '30',
  })
  @IsOptional()
  @IsString()
  planDuration?: string;

  @ApiPropertyOptional({
    description: 'Filter by financial Status',
    example: 'Paid',
  })
  @IsOptional()
  @IsString()
  financialStatus?: string;
}

export class CustomerPageOrderListBodyDto {
  @ApiPropertyOptional({
    example: 'notall',
    description: 'Type of data to fetch',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    example: 'Meal Plan Orders',
    description: 'Type of order',
  })
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional({
    example: '60c72b2f9b1e8b3f8c8f8b3e',
    description: 'Customer ID',
  })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of records to fetch',
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsString()
  offset?: string;
}

export class ChangeBagBoxDto {
  @ApiProperty({
    description: 'Type of bag',
    enum: ['Paper Bag', 'Styrofoam Box'],
  })
  @IsString()
  @IsIn(['Paper Bag', 'Styrofoam Box'], {
    message: 'bag_type must be either "Paper Bag" or "Styrofoam Box"',
  })
  bag_type: string;
}
