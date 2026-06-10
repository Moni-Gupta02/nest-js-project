import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class DeleteLeadDto {
  @ApiProperty({ description: 'Lead ID to delete' })
  @IsString()
  leadId: string;

  @ApiProperty({ description: 'Email of the lead', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: 'Mobile number of the lead', required: false })
  @IsOptional()
  @IsString()
  mobileNumber?: string;
}
