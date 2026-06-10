import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityRuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  activity_key: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  label: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  delicoins_per_action: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  delicoins_per_day?: number;

  @ApiProperty()
  @IsBoolean()
  is_active: boolean;
}
