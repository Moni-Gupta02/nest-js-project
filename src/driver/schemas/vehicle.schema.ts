import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VehicleDocument = Vehicle & Document;

@Schema({ timestamps: true })
export class Vehicle {
  @Prop({ unique: true, required: true })
  vehicle_number: string;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
