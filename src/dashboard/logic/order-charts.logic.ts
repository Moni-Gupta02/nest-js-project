import * as moment from 'moment';
import type { Model } from 'mongoose';
import { parseDashboardQuery, type DashboardDateRange } from '../helpers/date-range';

export type OrderChartParams = {
  type: string;
  diff?: string;
};

/** Mirrors AdminJS order-details chart: pick hour vs date granularity from the range. */
export function resolveOrderChartParams(
  startDate: string,
  endDate: string,
  type?: string,
  diff?: string,
): OrderChartParams {
  const start = moment(new Date(startDate)).startOf('day');
  const end = moment(new Date(endDate)).startOf('day');
  const daySpan = end.diff(start, 'days') + 1;

  if (!type) {
    if (daySpan <= 1) {
      return { type: 'hour' };
    }
    return { type: 'date', diff: daySpan > 7 ? 'huge' : 'small' };
  }

  if (type === 'date' && !diff) {
    return { type: 'date', diff: daySpan > 7 ? 'huge' : 'small' };
  }

  return { type, diff };
}

export async function computeDailySalesBarGraph(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const { start, end } = range;

  const dailySalesData = await orderModel.aggregate([
    {
      $match: {
        financial_status: 'Paid',
        createdAt: {
          $gte: new Date(moment(start).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')),
          $lte: new Date(moment(end).endOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')),
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$final_order_total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return dailySalesData;
}

export async function computeOrderDetailsForChart(
  orderModel: Model<any>,
  type: string,
  startDate: string,
  endDate: string,
  diff?: string,
) {
  const range = parseDashboardQuery(startDate, endDate);
  const { start, end } = range;

  const paidCompleted = {
    createdAt: { $gte: start, $lte: end },
    order_status: 'Completed',
    financial_status: 'Paid',
  };

  if (type === 'hour') {
    const orderDetails = await orderModel.aggregate([
      { $match: paidCompleted },
      { $project: { hour: { $hour: '$createdAt' } } },
      { $group: { _id: '$hour', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const newOrderDetails = orderDetails?.map((itm) => ({
      _id: (itm?._id + 4) % 24,
      count: itm?.count,
      final_order_total: itm?.final_order_total,
    }));

    return { orderData: newOrderDetails };
  }

  if (type === 'date') {
    if (diff === 'huge') {
      const orderDetails = await orderModel.aggregate([
        { $match: paidCompleted },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      return { orderData: orderDetails };
    }

    if (diff === 'small') {
      const orderDetails = await orderModel.aggregate([
        { $match: paidCompleted },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              hour: { $hour: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.date',
            hours: { $push: { hour: '$_id.hour', count: '$count' } },
            total: { $sum: '$count' },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            hours: 1,
            total: 1,
          },
        },
      ]);
      return { orderData: orderDetails };
    }
  }

  return { orderData: [] };
}
