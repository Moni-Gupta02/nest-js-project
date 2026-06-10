import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SiteMap extends Document {
  @Prop({ unique: true, required: true })
  url: string;
}

export const SiteMapSchema = SchemaFactory.createForClass(SiteMap);
