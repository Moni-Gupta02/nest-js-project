import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class BagManagement {
  @Prop()
  bag_code: string;

  @Prop({ enum: ['In Store', 'Dispatched'] })
  status: string;

  @Prop({ enum: ['Ok', 'Damaged'], default: 'Ok' })
  bag_status: string;

  @Prop({ default: 6 })
  ice_packs_count: number;

  @Prop({ type: Types.ObjectId, ref: 'customer' })
  assign_to: Types.ObjectId;

  // Uncomment these fields if needed
  // @Prop({ type: Types.ObjectId, ref: 'delivery' })
  // delivery_id: Types.ObjectId;

  // @Prop({ type: Types.ObjectId, ref: 'user' })
  // assign_to_driver: Types.ObjectId;

  // @Prop()
  // awb: string;

  // @Prop()
  // vendor: string;

  // @Prop({ type: Types.ObjectId, ref: 'driver_bag_management' })
  // driver_bag_id: Types.ObjectId;
}

export type BagManagementDocument = BagManagement & Document;
export const BagManagementSchema = SchemaFactory.createForClass(BagManagement);
