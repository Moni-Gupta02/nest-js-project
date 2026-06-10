import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type MoltRecipeMenuDocument = MoltRecipeMenu & Document;

export enum MoltMenuStatus {
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  LIVE = 'Live',
  ARCHIVED = 'Archived',
}

// Mirrors RecipeMenu.TypeSchema exactly
const TypeSchema = new MongooseSchema(
  {
    protein_option: { type: [String], default: [] },
    protein_category: { type: String },
  },
  { _id: false },
);

// Mirrors RecipeMenu.RecipeList exactly
const RecipeListSchema = new MongooseSchema(
  {
    recipe_id: { type: Types.ObjectId, ref: 'Recipes_Detail' },
    type: { type: [TypeSchema], default: [] },
    status: {
      type: String,
      enum: ['Pending Approval', 'Approved', 'Rejected'],
      default: 'Pending Approval',
    },
  },
  { _id: false },
);

@Schema({ timestamps: true, collection: 'molt_recipe_menus' })
export class MoltRecipeMenu {
  // ── Delicut RecipeMenu fields (same structure) ────────────────────────────

  @Prop({ type: String })
  name: string;

  @Prop({ type: Number })
  menu_number: number;

  @Prop({ type: [RecipeListSchema], default: [] })
  recipe: Record<string, unknown>[];

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Boolean, default: false })
  is_live: boolean;

  @Prop({ type: Date, index: true })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  // ── Molt-specific fields ──────────────────────────────────────────────────

  @Prop({ type: String, default: '' })
  vendor_id: string;

  @Prop({ type: Types.ObjectId, ref: 'Recipe_Menu', default: null, index: true })
  source_menu_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(MoltMenuStatus),
    default: MoltMenuStatus.PENDING_APPROVAL,
    index: true,
  })
  status: MoltMenuStatus;

  @Prop({ type: String, default: '' })
  admin_comments: string;

  @Prop({ type: String, default: '' })
  approved_by: string;
}

export const MoltRecipeMenuSchema = SchemaFactory.createForClass(MoltRecipeMenu);
MoltRecipeMenuSchema.index({ startDate: -1, status: 1 });
