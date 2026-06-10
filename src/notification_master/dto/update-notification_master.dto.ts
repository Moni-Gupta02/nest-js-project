import { PartialType } from '@nestjs/swagger';
import { CreateNotificationMasterDto } from './create-notification_master.dto';
export class UpdateNotificationMasterDto extends PartialType(
  CreateNotificationMasterDto,
) {}
