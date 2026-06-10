import { PartialType } from '@nestjs/swagger';
import { CreateActivityRuleDto } from './create-activity-rule.dto';

export class UpdateActivityRuleDto extends PartialType(CreateActivityRuleDto) {}
