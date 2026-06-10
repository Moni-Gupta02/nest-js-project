import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = user & Document;

export class permissions {
  resource: string;
  actions: {
    includes(actions: string): unknown;
    type: [string];
    required: true;
  };
}
@Schema({ timestamps: true })
export class user {
  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  password: string;

  @Prop({ type: Number })
  scanner_pin: number;

  @Prop({ type: String })
  is_supervisor: string;

  @Prop({ type: String })
  name: string;

  @Prop({ type: String })
  role: string;

  @Prop({ type: permissions, required: false })
  permissions: permissions[];
}

export const UserSchema = SchemaFactory.createForClass(user);
