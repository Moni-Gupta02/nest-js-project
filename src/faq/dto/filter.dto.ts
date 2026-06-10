import { ApiProperty } from '@nestjs/swagger';

export class ListQueryDto {
  @ApiProperty({
    description: 'Offset for pagination',
    example: 0,
    required: false,
  })
  page: number;

  @ApiProperty({
    description: 'Limit for pagination',
    example: 10,
    required: false,
  })
  limit: number;

  @ApiProperty({
    required: false,
  })
  search?: string;
}
