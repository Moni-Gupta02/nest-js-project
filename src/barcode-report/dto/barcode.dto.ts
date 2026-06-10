import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export enum Phase {
  BATCH1 = 'Batch1',
  NDD = 'NDD',
}

export class BarcodeReportDto {
  @IsDateString()
  date: string;

  @IsEnum(Phase, {
    message: 'phase must be either Batch1 or NDD',
  })
  phase: Phase;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  forceContinue?: boolean;
}

export class BarcodeReportQueryDto extends BarcodeReportDto {
  @ApiPropertyOptional({ default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}