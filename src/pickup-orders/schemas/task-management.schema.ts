import { Schema, Document } from 'mongoose';

export interface TaskManagement extends Document {
  task_role: string;
  task_number: number;
  date: Date;
  order_number: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  task_type: string;
  subscription_id?: string;
  action: string;
  amount: number;
  active: boolean;
  attachment?: Record<string, any>;
}

export const TaskManagementSchema = new Schema(
  {
    task_role: { type: String, required: true },
    task_number: { type: Number, required: true, unique: true },
    date: { type: Date, required: true },
    order_number: { type: String },
    order_id: { type: Schema.Types.ObjectId, ref: 'Orders' },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customers' },
    customer_name: { type: String },
    task_type: { type: String },
    subscription_id: { type: Schema.Types.ObjectId, ref: 'Subscriptions' },
    action: { type: String },
    amount: { type: Number },
    active: { type: Boolean, default: true },
    attachment: { type: Object },
  },
  { timestamps: true },
);
