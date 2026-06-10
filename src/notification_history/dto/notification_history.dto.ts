import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsMongoId, IsString } from 'class-validator';

export class FilterNotificationHistoryDto {
  @ApiPropertyOptional({ example: 'SMS' })
  @IsOptional()
  @IsString()
  notification_type?: string;

  @ApiPropertyOptional({ enum: ['Pending', 'Delivered', 'Read', 'Failed'] })
  @IsOptional()
  @IsEnum(['Pending', 'Delivered', 'Read', 'Failed'])
  status?: string;

  @ApiPropertyOptional({ example: '615d09ab52858b0d249f676e' })
  @IsOptional()
  @IsMongoId()
  customer_id?: string;

  @ApiPropertyOptional({ example: 'Order Placed' })
  @IsOptional()
  @IsString()
  notification_title?: string;
}
