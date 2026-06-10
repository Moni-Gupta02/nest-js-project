import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type ChefAllocationDocument = ChefAllocation & Document;
@Schema({ timestamps: true })
export class ChefAllocation {
  @Prop({ type: String, required: true })
  item: string;

  @Prop({ type: Number, default: null })
  meal_index: number;

  @Prop({ type: Number, default: null })
  meal_code: number;

  @Prop({ type: Date, required: true })
  delivery_date: Date;

  @Prop({ type: String, required: true })
  delivery_type: string;

  @Prop({ type: Types.ObjectId, required: true })
  recipe_id: Types.ObjectId;

  @Prop({ type: String, default: null })
  chef: string;

  @Prop({ type: Types.ObjectId, default: null })
  chef_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  meal_type: string;

  @Prop({ type: Object, default: null })
  notes: Record<string, any>;

  @Prop({ type: Number, default: null })
  order: number;

  @Prop({ type: Array, required: true })
  variant: string[];

  @Prop({ type: Array, required: false })
  protein_option: string[];

  @Prop({ type: Object, required: true })
  plating: Record<string, any>;

  @Prop({ type: Boolean, required: false })
  all_component_updated: boolean;

  @Prop({ type: Boolean, required: false })
  plating_updated: boolean;

  @Prop({ type: Boolean, required: false })
  dishpatch_completed: boolean;

  @Prop({ type: String, default: 'cooking_pending' })
  current_status: string;

  @Prop({ type: Array, required: false })
  status_timing: any[];

  @Prop({ type: Number, default: 0 })
  total_deliveries: number;

  @Prop({ type: Number, default: 0 })
  scan_deliveries: number;

  @Prop({ type: Array, required: false })
  pdf_link: string[];

  @Prop({ type: Array, required: false })
  internal_image: string[];

  @Prop({ type: Boolean, required: false })
  is_finalized: boolean;

  @Prop({ type: Boolean, default: false })
  menu_allocation: boolean;

  @Prop({ type: Types.ObjectId, required: true })
  menu_id: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  avg_rating: number;

  @Prop({ type: Number, default: 0 })
  total_reviewer: number;
}

export const ChefAllocationSchema =
  SchemaFactory.createForClass(ChefAllocation);
