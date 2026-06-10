import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeReferralSales(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const { start, end } = range;
  const referralSales = await Order.aggregate([
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
        'customerData.referredBy.customer_id': { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        totalReferralSales: { $sum: '$final_order_total' },
        referralCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        referralSales: '$totalReferralSales',
        referralCount: 1,
      },
    },
  ]);

  return (
    referralSales[0] || {
      referralSales: 0,
      referralCount: 0,
    }
  );
}
