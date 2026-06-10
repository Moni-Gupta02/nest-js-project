import { IsOptional, IsEnum, IsString } from 'class-validator';

export class QueryBagManagementDto {
  @IsOptional()
  @IsString()
  bag_code?: string;

  @IsOptional()
  @IsEnum(['In Store', 'Dispatched'])
  status?: string;

  @IsOptional()
  @IsEnum(['Ok', 'Damaged'])
  bag_status?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
