import { ApiProperty } from '@nestjs/swagger';

export class AbandonedCartListQueryDto {
  @ApiProperty({
    description: 'list api call and csv api calls',
    example: 'list',
  })
  type: string;

  @ApiProperty({
    description: 'Start date for filtering abandoned carts',
    example: '2023-09-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date for filtering abandoned carts',
    example: '2023-09-30',
  })
  endDate: string;

  @ApiProperty({
    description: 'Offset for pagination',
    example: 0,
  })
  page: number;

  @ApiProperty({
    description: 'Limit for pagination',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    required: false,
  })
  search?: string;

  @ApiProperty({
    required: false,
  })
  customerType?: string;
}
