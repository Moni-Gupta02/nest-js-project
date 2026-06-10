import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationMasterDto {
  @ApiProperty({ example: 'User Registration' })
  type_of_notification: string;

  @ApiProperty({ example: 'Welcome Email' })
  title: string;

  @ApiProperty({ example: false })
  is_sms: boolean;

  @ApiProperty({ example: false })
  is_whatsapp: boolean;

  @ApiProperty({ example: true })
  is_email: boolean;

  @ApiProperty({ example: false })
  is_slack: boolean;

  @ApiProperty({ example: true })
  is_push_notification: boolean;

  @ApiProperty({ example: 'Welcome {{name}} to our platform' })
  sms_template: string;

  @ApiProperty({ example: 'Welcome {{name}} to our platform' })
  email_template: string;

  @ApiProperty({ example: 'Welcome {{name}} to our platform' })
  whatsapp_template: string;

  @ApiProperty({ example: 'Welcome {{name}} to our platform' })
  slack_template: string;

  @ApiProperty({ example: 'Welcome {{name}} to our platform' })
  push_notification_template: string;
}
