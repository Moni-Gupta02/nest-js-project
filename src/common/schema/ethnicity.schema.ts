import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EthnicityDataDocument = Ethnicity & Document;

@Schema({ timestamps: true, collection: 'ethnicities' })
export class Ethnicity {
  @Prop({ required: true, unique: true })
  name: string;
}

export const EthnicitySchema = SchemaFactory.createForClass(Ethnicity);
