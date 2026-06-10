import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export type SurveyDocument = Survey & Document;

@Schema({ timestamps: true })
export class ChildQuestion {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: ['Yes/No/Cancle', 'Text', 'Scale', 'Drop-Down', 'Child-Question'],
  })
  type: 'Yes/No/Cancle' | 'Text' | 'Scale' | 'Drop-Down' | 'Child-Question';
}

@Schema()
export class Question {
  @Prop({ required: true })
  text: string;

  @Prop({
    required: true,
    enum: [
      'Yes/No/Cancle',
      'Text',
      'Scale',
      'Drop-Down',
      'Child-Question',
      'Check-Box',
      'Multi-Chips',
      'Chips',
    ],
  })
  type:
    | 'Yes/No/Cancle'
    | 'Text'
    | 'Scale'
    | 'Drop-Down'
    | 'Child-Question'
    | 'Check-Box'
    | 'Multi-Chips'
    | 'Chips';

  @Prop({ type: MongooseSchema.Types.Mixed })
  option?: any;

  @Prop({ type: [ChildQuestion] })
  child_question_type?: ChildQuestion[];

  @Prop()
  description?: string;

  @Prop()
  placeholder?: string;

  @Prop({ default: false })
  required?: boolean;
}

@Schema({ timestamps: true })
export class Survey {
  @Prop({ required: true })
  title: string;

  @Prop()
  survey_description?: string;

  @Prop({ type: [Question], default: [] })
  questions: Question[];

  @Prop({ default: false })
  is_live?: boolean;

  @Prop({ default: 0 })
  reward?: number;

  @Prop({ default: 0 })
  reward_count?: number;
}

export const SurveySchema = SchemaFactory.createForClass(Survey);
