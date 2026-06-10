import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop()
  company: string;

  @Prop({ required: false })
  email: string;

  @Prop({ required: false })
  first_name: string;

  @Prop({ required: false })
  last_name: string;

  @Prop({ required: false })
  supplier_id: string;

  @Prop({ type: Types.ObjectId, ref: 'MasterDataKMS' })
  supplier_type: string;

  @Prop({ required: false })
  mobile_number: number;

  @Prop({ required: false })
  VAT_number: number;

  @Prop({ required: false })
  address1: string;

  @Prop({ required: false })
  address2: string;

  @Prop({ required: false })
  notes: string;
}

export const supplierSchema = SchemaFactory.createForClass(Supplier);
