import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityRuleDocument } from './schema/activity-rule.schema';
import { CreateActivityRuleDto } from './dto/create-activity-rule.dto';

@Injectable()
export class ActivityRuleService {
  constructor(
    @InjectModel('ActivityRule')
    private readonly activity_rule_model: Model<ActivityRuleDocument>,
  ) {}

  async create(create_activity_rule_dto: CreateActivityRuleDto) {
    try {
      const rule = new this.activity_rule_model(create_activity_rule_dto);
      return await rule.save();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async find_all() {
    return await this.activity_rule_model.find().exec();
  }

  async find_one(id: string) {
    return await this.activity_rule_model.findById(id).exec();
  }

  async update(id: string, update_activity_rule_dto: CreateActivityRuleDto) {
    try {
      return await this.activity_rule_model.findByIdAndUpdate(
        id,
        update_activity_rule_dto,
        { new: true, runValidators: true },
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async delete(id: string) {
    return await this.activity_rule_model.findByIdAndDelete(id).exec();
  }
}
