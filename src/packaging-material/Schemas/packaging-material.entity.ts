import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Supplier } from 'src/supplier/schemas/supplier.schemas';

export type PackagingMaterialDocument = PackagingMaterial & Document;

export class Supplier_Details {
  product_name: string;
  // supplier: { type: Types.ObjectId; ref: 'Supplier' }; // Reference to the Supplier schema
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Supplier' }] })
  supplier: Supplier[];
  //   supplier_type: {
  //     type: [{ type: Types.ObjectId; ref: 'Cuisine' }];
  //     default: [];
  //   };
  supplier_pref: number;
  single_package: {
    size: number;
    unit: string;
    price: number;
    // per_kg_price: number;
  };
  bulk_package: {
    size: number;
    unit: string;
    price: number;
    bulk_number: number;
    single_package_orderable: boolean;
    // per_kg_price: number;
  };
  is_active: boolean;
}

@Schema({ timestamps: true })
export class PackagingMaterial {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop()
  note: string;

  @Prop({ type: Supplier_Details })
  supplier_details: Supplier_Details[];

  @Prop({ default: true })
  is_active: boolean;
}

export const PackagingMaterialSchema =
  SchemaFactory.createForClass(PackagingMaterial);
