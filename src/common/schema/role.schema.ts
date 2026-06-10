import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDataDocument = role & Document;

@Schema({ timestamps: true })
export class role {
  @Prop({ type: String })
  resource: string;

  @Prop({ type: Array })
  actions: string[];

  @Prop({ type: String })
  group: string;

  @Prop({ type: Number })
  group_index: number;
}

export const RoleSchema = SchemaFactory.createForClass(role);
