import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MediaImageDocument = Media & Document;

@Schema({ timestamps: true })
export class Media {
  @Prop({ required: true })
  model_name: string;

  @Prop({ required: true })
  media_size: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  file_name: string;

  @Prop({ required: true })
  file_type: string;

  @Prop({ required: false })
  variant_type: string;

  @Prop({ required: false })
  variant_subtype: string;
}

export const MediaImageSchema = SchemaFactory.createForClass(Media);
