import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  MANUAL_LEAD_STAGE_CODES,
  MQL_SUB_STAGE_CODES,
} from '../constants/lead-funnel.constants';

export class UpdateLeadStageDto {
  @ApiProperty({ required: false, example: '69aa6dc946c777d5bd4bd289' })
  @IsString()
  @IsOptional()
  cart_id?: string;

  @ApiProperty({ required: false, example: '6a157d9841f37cc54335c96b' })
  @IsString()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({
    example: 'MQL',
    enum: [...MANUAL_LEAD_STAGE_CODES],
    description:
      'Manual stages only. SQL is set on payment link; CONVERTED on payment capture.',
  })
  @IsString()
  @IsIn([...MANUAL_LEAD_STAGE_CODES])
  @IsNotEmpty()
  stage_code: string;

  @ApiProperty({ required: false, example: 'Spoke with customer on call' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({
    required: false,
    example: 'CALL_AFTER_1_DAY',
    enum: [...MQL_SUB_STAGE_CODES],
    description: 'Applicable only when stage_code is MQL',
  })
  @IsString()
  @IsIn([...MQL_SUB_STAGE_CODES])
  @IsOptional()
  sub_stage?: string;

  @ApiProperty({ required: false, example: '2026-05-01' })
  @IsString()
  @IsOptional()
  start_date?: string;

  @ApiProperty({ required: false, example: '2026-05-28' })
  @IsString()
  @IsOptional()
  end_date?: string;
}
