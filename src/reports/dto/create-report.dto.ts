export class CreateReportDto {}
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SurveyReportDto {
  @ApiProperty({
    example: '67fd26e27f2b014dcfca556f',
  })
  @IsOptional()
  @IsString()
  surveyId: string;
}
