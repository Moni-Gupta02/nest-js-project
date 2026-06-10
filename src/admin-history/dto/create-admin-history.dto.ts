import { IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
export class CreateAdminHistoryDto {
  @IsString()
  type: string;

  @IsObject()
  before_change?: Record<string, any>;

  @IsObject()
  after_change?: Record<string, any>;

  @IsObject()
  changed_by?: Record<string, any>;

  @IsObject()
  change_details?: Record<string, any>;
}

export class GetAdminHistoryDto {
  @ApiProperty({ example: '2024-01-01', required: true })
  startDate: string;

  @ApiProperty({ example: '2024-01-31', required: true })
  endDate: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: 'web' })
  platform?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false, example: 'john' })
  search?: string;

  @IsString()
  @ApiProperty({ example: '1', required: true })
  page: string;

  @IsString()
  @ApiProperty({ example: '10', required: true })
  limit: string;
}
