import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class MetaScript extends Document {
  @Prop()
  key: string;

  @Prop({ type: [String] })
  meta_script: string[];
}

export const MetaScriptSchema = SchemaFactory.createForClass(MetaScript);
