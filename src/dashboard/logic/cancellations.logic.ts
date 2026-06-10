import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeCancellationDetails(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const { start, end } = range;

  const [cancellationCompleteDetails, cancellationPartialDetails] = await Promise.all([
    Order.find(
      {
        cancelAt: { $gte: start, $lte: end },
        order_type: 'subscription',
        order_status: 'Cancelled',
        financial_status: 'Paid',
      },
      { _id: 1, refund: 1, reason: 1 },
    ),
    Order.find(
      {
        createdAt: { $gte: start, $lte: end },
        order_type: 'subscription',
        order_status: 'Partially_Cancelled',
        financial_status: 'Paid',
      },
      { _id: 1, refund: 1, reason: 1 },
    ),
  ]);

  const cancellationDetails: {
    total: number;
    partial: { reason: string; count: number }[];
    complete: { reason: string; count: number }[];
    amount: number;
  } = {
    total: 0,
    partial: [],
    complete: [],
    amount: 0,
  };

  const partial: { reason: string; count: number }[] = [];
  const complete: { reason: string; count: number }[] = [];

  cancellationCompleteDetails?.forEach((itm: any) => {
    const index = complete.findIndex((comp) => comp.reason === itm.reason);
    if (index === -1) {
      complete.push({ reason: itm?.reason, count: 1 });
      cancellationDetails.total += 1;
      cancellationDetails.amount += parseFloat(itm?.refund);
    } else {
      complete[index].count += 1;
      cancellationDetails.total += 1;
      cancellationDetails.amount += parseFloat(itm?.refund);
    }
  });

  cancellationPartialDetails?.forEach((itm: any) => {
    const index = partial.findIndex((comp) => comp.reason === itm.reason);
    if (index === -1) {
      partial.push({ reason: itm?.reason, count: 1 });
      cancellationDetails.total += 1;
      cancellationDetails.amount += parseFloat(itm?.refund);
    } else {
      partial[index].count += 1;
      cancellationDetails.total += 1;
      cancellationDetails.amount += parseFloat(itm?.refund);
    }
  });

  cancellationDetails.partial = partial;
  cancellationDetails.complete = complete;

  return cancellationDetails;
}
