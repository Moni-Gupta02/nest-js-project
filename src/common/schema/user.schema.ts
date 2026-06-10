import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OldUserDocument = olduser & Document;

@Schema({ timestamps: true })
export class olduser {
  @Prop({ type: String, unique: true, required: true })
  email: string;

  @Prop({ type: String, unique: true, required: true })
  encryptedPassword: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  role: string;

  @Prop({ type: String, unique: true, required: true })
  scanner_pin: string;

  @Prop({ type: Boolean })
  is_supervisor: boolean;
}

export const OldUserSchema = SchemaFactory.createForClass(olduser);
