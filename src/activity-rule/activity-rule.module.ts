import { Module } from '@nestjs/common';
import { ActivityRuleService } from './activity-rule.service';
import { ActivityRuleController } from './activity-rule.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityRuleSchema } from './schema/activity-rule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ActivityRule', schema: ActivityRuleSchema },
    ]),
  ],
  controllers: [ActivityRuleController],
  providers: [ActivityRuleService],
})
export class ActivityRuleModule {}
