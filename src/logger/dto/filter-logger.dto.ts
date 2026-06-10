import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterLoggerDto {
  @ApiPropertyOptional({ example: 'error' })
  level?: string;

  @ApiPropertyOptional({ example: '2024-10-01' })
  fromDate?: string;

  @ApiPropertyOptional({ example: '2024-10-03' })
  toDate?: string;

  @ApiPropertyOptional({ example: 'GET' })
  requestMethod?: string;

  @ApiPropertyOptional({ example: '123.45.67.89' })
  clientIp?: string;

  @ApiPropertyOptional({ example: '/api/v1/resource' })
  requestUrl?: string;
}
