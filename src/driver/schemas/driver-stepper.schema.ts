import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class DriverData {
  @ApiProperty({ description: 'Driver user ID' })
  @Prop({ type: Types.ObjectId, ref: 'user' })
  driver_id: Types.ObjectId;

  @ApiProperty({ description: 'Maximum deliveries allowed', example: 50 })
  @Prop({ type: Number })
  max_deliveries: number;

  @ApiProperty({ description: 'Available deliveries count', example: 30 })
  @Prop({ type: Number })
  available_deliveries: number;

  @ApiProperty({ description: 'Extra deliveries count', example: 5 })
  @Prop({ type: Number })
  extra_deliveries: number;
}

@Schema({
  collection: 'driver_steppers',
  timestamps: true,
})
export class DriverStepper extends Document {
  @ApiProperty({
    description: 'Delivery date',
    example: '2025-01-09T00:00:00.000Z',
  })
  @Prop({
    type: Date,
    unique: true,
    required: true,
    index: true,
  })
  date: Date;

  @ApiProperty({
    description: 'MP (Morning Phase) stepper data',
  })
  @Prop({ type: Object })
  mp: any;

  @ApiProperty({
    description: 'NDD (Next Day Delivery) stepper data',
  })
  @Prop({ type: Object })
  ndd: any;

  @ApiProperty({
    description: 'Pick up stepper data',
  })
  @Prop({ type: Object })
  pick_up: any;

  @ApiProperty({
    description: 'Driver allocation data',
    type: [DriverData],
  })
  @Prop([
    {
      driver_id: { type: Types.ObjectId, ref: 'user' },
      max_deliveries: { type: Number },
      available_deliveries: { type: Number },
      extra_deliveries: { type: Number },
    },
  ])
  drivers_data: DriverData[];

  @ApiProperty({ description: 'Record creation timestamp' })
  createdAt?: Date;

  @ApiProperty({ description: 'Record update timestamp' })
  updatedAt?: Date;
}

export const DriverStepperSchema = SchemaFactory.createForClass(DriverStepper);
