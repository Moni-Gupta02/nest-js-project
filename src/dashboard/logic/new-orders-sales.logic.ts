import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeNewOrderSales(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const { start, end } = range;
  const newOrderSales = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        type_of_order: 'new',
        order_status: 'Completed',
        financial_status: 'Paid',
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer_id',
        foreignField: '_id',
        as: 'customerData',
      },
    },
    { $unwind: { path: '$customerData' } },
    {
      $match: {
        'customerData.referredBy.customer_id': { $exists: false },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$final_order_total' },
        newOrderCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        totalNewSales: '$totalSales',
        newOrderCount: 1,
      },
    },
  ]);

  return (
    newOrderSales[0] || {
      totalNewSales: 0,
      newOrderCount: 0,
    }
  );
}
