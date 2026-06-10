import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeSmartPlanSales(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const { start, end } = range;

  const orders = await Order.find(
    {
      createdAt: { $gte: start, $lte: end },
      order_type: 'subscription',
      order_status: 'Completed',
      financial_status: 'Paid',
      plan: 'smart_saver',
    },
    {
      final_order_total: 1,
      _id: 0,
      refundable_deposite: 1,
      type_of_order: 1,
      'order_item.plan_duration_in_days': 1,
    },
  ).lean();

  const Sales: Record<string, any> = {
    mp: 0,
    mp_count: 0,
    mp_new: 0,
    mp_new_count: 0,
    mp_renewal: 0,
    mp_renewal_count: 0,
    mp_refundable_deposite: 0,
    sales_value: [] as { days: number; value: number; count: number }[],
  };

  for (const itm of orders) {
    const deposit = itm?.refundable_deposite ? Number(itm.refundable_deposite) : 0;
    const finalTotal = Number(itm?.final_order_total) - deposit;

    Sales.mp += finalTotal;
    Sales.mp_count += 1;

    if (itm?.type_of_order === 'new') {
      Sales.mp_new += finalTotal;
      Sales.mp_new_count += 1;
    } else if (itm?.type_of_order === 're-new') {
      Sales.mp_renewal += finalTotal;
      Sales.mp_renewal_count += 1;
    }

    const days = Number(itm?.order_item?.[0]?.plan_duration_in_days);
    const salesIndex = Sales.sales_value.findIndex(
      (salesData: any) => salesData?.days === days,
    );
    if (salesIndex === -1) {
      Sales.sales_value.push({ days, value: finalTotal, count: 1 });
    } else {
      Sales.sales_value[salesIndex].value += finalTotal;
      Sales.sales_value[salesIndex].count += 1;
    }

    if (itm?.refundable_deposite) {
      Sales.mp_refundable_deposite += deposit;
    }
  }

  Sales.sales_value.sort((a: any, b: any) => (a?.days ?? 0) - (b?.days ?? 0));

  return Sales;
}
