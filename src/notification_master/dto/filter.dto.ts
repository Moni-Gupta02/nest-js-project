import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterNotificationMasterDto {
  @ApiPropertyOptional({ example: 'User Registration' })
  type_of_notification?: string;

  @ApiPropertyOptional({ example: 'Welcome Email' })
  title?: string;

  @ApiPropertyOptional({ example: true })
  is_sms?: boolean;

  @ApiPropertyOptional({ example: true })
  is_whatsapp?: boolean;

  @ApiPropertyOptional({ example: true })
  is_email?: boolean;

  @ApiPropertyOptional({ example: true })
  is_slack?: boolean;

  @ApiPropertyOptional({ example: true })
  is_push_notification?: boolean;
}
