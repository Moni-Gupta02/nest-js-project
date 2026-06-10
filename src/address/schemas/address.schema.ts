import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AddressDocument = Address & Document;

@Schema({ timestamps: true })
export class Address {
  @Prop({ type: Types.ObjectId, ref: 'Customers', required: true })
  customer_id: Types.ObjectId;

  @Prop({ type: String })
  address_type: string;

  @Prop({ type: String })
  full_address: string;

  @Prop({ type: String })
  city: string;

  @Prop({ type: String })
  province: string;

  @Prop({ type: String, default: 'United Arab Emirates' })
  country: string;

  @Prop({ type: Number })
  latitude: number;

  @Prop({ type: Number })
  longitude: number;

  @Prop({ type: Boolean, default: false })
  is_default: number;

  @Prop({ type: Boolean, default: false })
  is_active: number;

  @Prop({ type: String, required: false })
  delivery_note: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
