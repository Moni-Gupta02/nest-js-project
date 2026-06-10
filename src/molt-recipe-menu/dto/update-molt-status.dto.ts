import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { MoltMenuStatus } from '../schemas/molt-recipe-menu.schema';

const ALLOWED_STATUSES = [
  MoltMenuStatus.APPROVED,
  MoltMenuStatus.REJECTED,
  MoltMenuStatus.LIVE,
  MoltMenuStatus.ARCHIVED,
] as const;

export class UpdateMoltStatusDto {
  @ApiProperty({
    enum: ALLOWED_STATUSES,
    example: MoltMenuStatus.APPROVED,
    description: 'New status for the molt recipe menu',
  })
  @IsIn(ALLOWED_STATUSES, {
    message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
  })
  status: MoltMenuStatus;

  @ApiPropertyOptional({ example: 'Looks good' })
  @IsOptional()
  @IsString()
  admin_comments?: string;

  @ApiPropertyOptional({ example: 'Admin Name' })
  @IsOptional()
  @IsString()
  approved_by?: string;
}
