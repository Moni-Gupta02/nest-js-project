import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

function subtractDeposit(finalTotal: number, refundableDeposite?: number | string | null): number {
  let total = finalTotal;
  if (refundableDeposite) {
    total -= parseFloat(String(refundableDeposite));
  }
  return total;
}

export async function computeFlexiPlanSales(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const { start, end } = range;
  const baseMatch = {
    createdAt: { $gte: start, $lte: end },
    order_type: 'subscription',
    order_status: 'Completed',
    financial_status: 'Paid',
    is_flex_plan: true,
  };

  const [mpSales, salesByDays, refundableDeposite] = await Promise.all([
    Order.find(baseMatch, {
      final_order_total: 1,
      _id: 0,
      refundable_deposite: 1,
      type_of_order: 1,
    }),
    Order.find(baseMatch, {
      final_order_total: 1,
      _id: 0,
      refundable_deposite: 1,
      'order_item.plan_duration_in_days': 1,
    }),
    Order.find(
      { ...baseMatch, refundable_deposite: { $exists: true } },
      { _id: 0, refundable_deposite: 1 },
    ),
  ]);

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

  mpSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    Sales.mp += finalTotal;
    Sales.mp_count += 1;
    if (itm?.type_of_order === 'new') {
      Sales.mp_new += finalTotal;
      Sales.mp_new_count += 1;
    } else if (itm?.type_of_order === 're-new') {
      Sales.mp_renewal += finalTotal;
      Sales.mp_renewal_count += 1;
    }
  });

  salesByDays?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
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
  });

  Sales.sales_value.sort((a: any, b: any) => (a?.days ?? 0) - (b?.days ?? 0));

  refundableDeposite?.forEach((itm: any) => {
    Sales.mp_refundable_deposite += parseFloat(itm?.refundable_deposite);
  });

  return Sales;
}
