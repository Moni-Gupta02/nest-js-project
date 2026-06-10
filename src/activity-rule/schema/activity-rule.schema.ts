import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ActivityRuleDocument = ActivityRule & Document;

@Schema({ timestamps: true })
export class ActivityRule {
  @ApiProperty()
  @Prop({ required: true, minlength: 2, maxlength: 50, unique: true })
  activity_key: string;

  @ApiProperty()
  @Prop({ required: true, minlength: 2, maxlength: 100 })
  label: string;

  @ApiProperty()
  @Prop({ required: true, min: 1 })
  delicoins_per_action: number;

  @ApiProperty({ required: false })
  @Prop({ min: 1 })
  delicoins_per_day?: number;

  @ApiProperty()
  @Prop({ required: true, default: true })
  is_active: boolean;
}

export const ActivityRuleSchema = SchemaFactory.createForClass(ActivityRule);
