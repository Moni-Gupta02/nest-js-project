import { PartialType } from '@nestjs/swagger';
import { CreateAdminHistoryDto } from './create-admin-history.dto';

export class UpdateAdminHistoryDto extends PartialType(CreateAdminHistoryDto) {}
