import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class DriverBagCustomerDetail {
  @Prop({ type: Types.ObjectId, ref: 'customer' })
  customer_id: Types.ObjectId;

  @Prop()
  customer_name: string;

  @Prop({ type: Types.ObjectId, ref: 'delivery' })
  delivery_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'order' })
  order_id: Types.ObjectId;

  @Prop()
  bag_opted: boolean;

  @Prop()
  bag_type: string;
}

const DriverBagCustomerDetailSchema = SchemaFactory.createForClass(
  DriverBagCustomerDetail,
);

@Schema({
  timestamps: true,
  collection: 'driver_bag_managements',
})
export class DriverBagManagement {
  @Prop()
  awb: string;

  @Prop({ enum: ['pick_up', 'delivery', 'pickup'] })
  type: string;

  @Prop({ type: Date })
  delivery_date: Date;

  @Prop()
  area: string;

  @Prop()
  city: string;

  @Prop()
  slot: string;

  @Prop()
  address: string;

  @Prop({
    enum: ['Unassigned', 'Assigned', 'Picked Up', 'Delivered', 'Failed'],
  })
  status: string;

  @Prop()
  order_number: string;

  @Prop()
  internal_code: string;

  @Prop()
  customer_name: string;

  @Prop()
  customer_mobile: string;

  @Prop()
  helper: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  helper_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assign_driver: Types.ObjectId;

  @Prop({ type: Date })
  Pickup_time: Date;

  @Prop({ type: Date })
  delivered_time: Date;

  @Prop({ type: Date })
  failed_time: Date;

  @Prop()
  vendor: string;

  @Prop()
  failed_reason: string;

  @Prop()
  note: string;

  @Prop({ type: [MongooseSchema.Types.Mixed] })
  photograph: unknown[];

  @Prop()
  received_bag_count: number;

  @Prop({ type: [MongooseSchema.Types.Mixed] })
  received_bag: unknown[];

  @Prop({ type: [MongooseSchema.Types.Mixed] })
  received_bag_photograph: unknown[];

  @Prop()
  ice_packs_count: number;

  @Prop()
  order_type: string;

  @Prop({ type: [DriverBagCustomerDetailSchema] })
  customerDetails: DriverBagCustomerDetail[];

  @Prop({ default: false })
  is_allocation_complete: boolean;

  @Prop()
  no_of_package: string;

  @Prop()
  package_details: string;

  @Prop()
  country: string;

  @Prop()
  after_time: string;

  @Prop()
  before_time: string;

  @Prop()
  delivery_notes: string;

  @Prop({ type: [MongooseSchema.Types.Mixed] })
  instruction: unknown[];

  @Prop()
  longitude: string;

  @Prop()
  latitude: string;
}

export type DriverBagManagementDocument = DriverBagManagement & Document;
export const DriverBagManagementSchema =
  SchemaFactory.createForClass(DriverBagManagement);
