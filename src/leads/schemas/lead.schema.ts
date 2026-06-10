import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define the interface for the Leads document
export type LeadsDocument = Leads & Document;

@Schema({ timestamps: true })
export class Leads {
  @Prop({ type: String })
  name: string;

  @Prop({ required: false, type: String })
  mobile_number: string;

  @Prop()
  country_code: string;

  @Prop({ required: false })
  email: string;

  @Prop({ type: String })
  source: string;

  @Prop({ type: [String] })
  type_of_query: string[];

  @Prop({ type: String })
  comments: string;

  @Prop({ type: String })
  created_by: string;
}

// Create the schema factory
export const LeadsSchema = SchemaFactory.createForClass(Leads);
