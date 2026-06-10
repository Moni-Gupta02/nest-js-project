import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionsDocument = Permissions & Document;

@Schema({ timestamps: true })
export class Permissions {
  @Prop({ type: String })
  resource: string;

  @Prop({ type: Number })
  index: number;

  @Prop({ type: Array })
  actions: string[];

  @Prop({ type: String })
  group: string;

  @Prop({ type: Number })
  group_index: number;
}

export const PermissionsSchema = SchemaFactory.createForClass(Permissions);
