import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, Document, Schema as MongooseSchema } from 'mongoose';
export type SurveyResponseDataDocument = SurveyResponse & Document;

@Schema({ timestamps: true })
export class SurveyResponse {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'survey', required: true })
  survey_id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  survey_title: string;

  @Prop({ type: String, ref: 'customer' })
  customer_id?: string;

  @Prop()
  finalize?: boolean;

  @Prop({ default: false })
  skip?: boolean;

  @Prop([
    {
      question: { type: String, required: true },
      answer: { type: MongooseSchema.Types.Mixed },
      question_id: { type: String, required: true },
    },
  ])
  answers: { question: string; answer: any; question_id: string }[];

  @Prop({ enum: ['guest', 'customer'] })
  customer_type?: 'guest' | 'customer';

  @Prop({ enum: ['TRIAL', 'MONTHLY'] })
  plan_type?: 'TRIAL' | 'MONTHLY';

  @Prop({ type: Date })
  survey_timelog?: Date;

  @Prop({ default: 0 })
  reward?: number;
}

export const SurveyResponseSchema =
  SchemaFactory.createForClass(SurveyResponse);
