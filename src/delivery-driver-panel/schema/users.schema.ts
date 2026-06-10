import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes } from 'mongoose';

export type UserDocument = User & Document;

class PermissionListEdit {
  @Prop({ type: Boolean, default: false })
  list: boolean;

  @Prop({ type: Boolean, default: false })
  edit: boolean;
}

class PermissionShowExport {
  @Prop({ type: Boolean, default: false })
  show: boolean;

  @Prop({ type: Boolean, default: false })
  export: boolean;
}

class PermissionListEditShow {
  @Prop({ type: Boolean, default: false })
  list: boolean;

  @Prop({ type: Boolean, default: false })
  edit: boolean;

  @Prop({ type: Boolean, default: false })
  show: boolean;
}

class PermissionListEditDeleteShow {
  @Prop({ type: Boolean, default: false })
  list: boolean;

  @Prop({ type: Boolean, default: false })
  edit: boolean;

  @Prop({ type: Boolean, default: false })
  delete: boolean;

  @Prop({ type: Boolean, default: false })
  show: boolean;
}

class PermissionCrud {
  @Prop({ type: Boolean, default: false })
  list: boolean;

  @Prop({ type: Boolean, default: false })
  create: boolean;

  @Prop({ type: Boolean, default: false })
  edit: boolean;

  @Prop({ type: Boolean, default: false })
  delete: boolean;
}

class PermissionCrudShow {
  @Prop({ type: Boolean, default: false })
  list: boolean;

  @Prop({ type: Boolean, default: false })
  create: boolean;

  @Prop({ type: Boolean, default: false })
  edit: boolean;

  @Prop({ type: Boolean, default: false })
  delete: boolean;

  @Prop({ type: Boolean, default: false })
  show: boolean;
}

class DashboardPermission {
  @Prop({ type: Boolean, default: false })
  overall_sales: boolean;

  @Prop({ type: Boolean, default: false })
  visitors: boolean;

  @Prop({ type: Boolean, default: false })
  auto_selection_engine: boolean;

  @Prop({ type: Boolean, default: false })
  order_graph: boolean;

  @Prop({ type: Boolean, default: false })
  durations: boolean;

  @Prop({ type: Boolean, default: false })
  cancellation: boolean;
}

class CustomerPermission {
  @Prop({ type: Boolean, default: false })
  list: boolean;

  @Prop({ type: Boolean, default: false })
  edit: boolean;

  @Prop({ type: Boolean, default: false })
  show: boolean;

  @Prop({ type: Boolean, default: false })
  export: boolean;
}

class RecipePermission extends PermissionCrud {
  @Prop({ type: Boolean, default: false })
  duplicate: boolean;
}

class BagLiveStatusPermission extends PermissionCrud {
  @Prop({ type: Boolean, default: false })
  export: boolean;
}

class TranscorpReportPermission {
  @Prop({ type: Boolean, default: false })
  edit: boolean;

  @Prop({ type: Boolean, default: false })
  export: boolean;
}

class OnlyShowPermission {
  @Prop({ type: Boolean, default: false })
  show: boolean;
}

class OnlyListPermission {
  @Prop({ type: Boolean, default: false })
  list: boolean;
}

class TaskManagementPermission {
  @Prop({ type: Boolean, default: false })
  customer_support: boolean;

  @Prop({ type: Boolean, default: false })
  accounts: boolean;
}

class DriverPanelPermission {
  @Prop({ type: Boolean, default: false })
  show: boolean;

  @Prop({ type: Boolean, default: false })
  export: boolean;
}

@Schema({ timestamps: true, collection: 'users', strict: false })
export class User {
  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  encryptedPassword: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: [String], default: [] })
  group: string[];

  @Prop({ type: SchemaTypes.Mixed, default: {} })
  details: Record<string, any>;

  @Prop({ type: DashboardPermission, default: {} })
  dashboard: DashboardPermission;

  @Prop({ type: CustomerPermission, default: {} })
  customer: CustomerPermission;

  @Prop({ type: PermissionListEditShow, default: {} })
  order: PermissionListEditShow;

  @Prop({ type: PermissionCrudShow, default: {} })
  leads: PermissionCrudShow;

  @Prop({ type: OnlyListPermission, default: {} })
  admin_history: OnlyListPermission;

  @Prop({ type: PermissionListEditShow, default: {} })
  abandonedCart: PermissionListEditShow;

  @Prop({ type: PermissionListEditShow, default: {} })
  failedOrders: PermissionListEditShow;

  @Prop({ type: PermissionShowExport, default: {} })
  rating_report: PermissionShowExport;

  @Prop({ type: PermissionCrud, default: {} })
  user: PermissionCrud;

  @Prop({ type: PermissionListEdit, default: {} })
  delivery_slot: PermissionListEdit;

  @Prop({ type: PermissionCrud, default: {} })
  category: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  ingredient: PermissionCrud;

  @Prop({ type: PermissionListEditShow, default: {} })
  master_data: PermissionListEditShow;

  @Prop({ type: PermissionCrud, default: {} })
  dish_type: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  cuisine: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  packaging_material: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  variant: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  allergens: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  barcode_place: PermissionCrud;

  @Prop({ type: RecipePermission, default: {} })
  recipes: RecipePermission;

  @Prop({ type: PermissionCrud, default: {} })
  translation: PermissionCrud;

  @Prop({ type: PermissionListEdit, default: {} })
  subscription_price: PermissionListEdit;

  @Prop({ type: PermissionListEdit, default: {} })
  subscription_fix_price: PermissionListEdit;

  @Prop({ type: PermissionCrudShow, default: {} })
  coupon: PermissionCrudShow;

  @Prop({ type: PermissionListEditDeleteShow, default: {} })
  address: PermissionListEditDeleteShow;

  @Prop({ type: PermissionCrudShow, default: {} })
  notification_master: PermissionCrudShow;

  @Prop({ type: PermissionListEditDeleteShow, default: {} })
  logger: PermissionListEditDeleteShow;

  @Prop({ type: PermissionListEditDeleteShow, default: {} })
  notification_history: PermissionListEditDeleteShow;

  @Prop({ type: PermissionCrudShow, default: {} })
  blog: PermissionCrudShow;

  @Prop({ type: PermissionCrud, default: {} })
  blog_tag: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  blog_category: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  author: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  web_stories: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  webStories_category: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  food_recipe: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  delivery_locations: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  who_we_serve: PermissionCrud;

  @Prop({ type: BagLiveStatusPermission, default: {} })
  bag_live_status: BagLiveStatusPermission;

  @Prop({ type: TranscorpReportPermission, default: {} })
  transcorp_report: TranscorpReportPermission;

  @Prop({ type: PermissionShowExport, default: {} })
  customer_holding_report: PermissionShowExport;

  @Prop({ type: OnlyShowPermission, default: {} })
  deposit_refund_report: OnlyShowPermission;

  @Prop({ type: OnlyShowPermission, default: {} })
  bag_analytics: OnlyShowPermission;

  @Prop({ type: OnlyShowPermission, default: {} })
  calender: OnlyShowPermission;

  @Prop({ type: PermissionShowExport, default: {} })
  kitchen_summary_report: PermissionShowExport;

  @Prop({ type: PermissionShowExport, default: {} })
  kitchen_production_report: PermissionShowExport;

  @Prop({ type: PermissionShowExport, default: {} })
  plating_summary_report: PermissionShowExport;

  @Prop({ type: PermissionShowExport, default: {} })
  portioning_report: PermissionShowExport;

  @Prop({ type: PermissionShowExport, default: {} })
  barcode_report: PermissionShowExport;

  @Prop({ type: PermissionShowExport, default: {} })
  finance_report: PermissionShowExport;

  @Prop({ type: PermissionShowExport, default: {} })
  avoid_ingredient: PermissionShowExport;

  @Prop({ type: PermissionCrud, default: {} })
  sitemap_url: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  faq: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  faq_category: PermissionCrud;

  @Prop({ type: String, unique: true, required: true })
  scanner_pin: string;

  @Prop({ type: Boolean })
  is_supervisor: boolean;

  @Prop({ type: PermissionCrud, default: {} })
  meta_script: PermissionCrud;

  @Prop({ type: OnlyListPermission, default: {} })
  newsletter: OnlyListPermission;

  @Prop({ type: TaskManagementPermission, default: {} })
  task_management: TaskManagementPermission;

  @Prop({ type: OnlyShowPermission, default: {} })
  survey: OnlyShowPermission;

  @Prop({ type: DriverPanelPermission, default: {} })
  driver_panel: DriverPanelPermission;

  @Prop({ type: PermissionCrud, default: {} })
  vehicle: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  driver: PermissionCrud;

  @Prop({ type: PermissionCrud, default: {} })
  helper: PermissionCrud;
}

export const UserSchema = SchemaFactory.createForClass(User);