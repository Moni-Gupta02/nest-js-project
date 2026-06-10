import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export type DeviceStatBucket = {
  totalCount: number;
  totalPrice: number;
  iosCount?: number;
  androidCount?: number;
  iosPrice?: number;
  androidPrice?: number;
};

export type OsStatBucket = {
  totalCount: number;
  totalPrice: number;
};

export type OrderDeviceAnalyticsResult = {
  totalOrders: number;
  deviceStats: Record<string, DeviceStatBucket>;
  osStats: Record<string, OsStatBucket>;
};

type DeviceAggregationRow = {
  _id: string;
  totalCount: number;
  totalPrice: number;
  iosCount: number;
  androidCount: number;
  iosPrice: number;
  androidPrice: number;
};

type OsAggregationRow = {
  _id: string;
  totalCount: number;
  totalPrice: number;
};

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Shared fields: platform is primary (ios/android); os is fallback when not "Unknown". */
const CLIENT_PLATFORM_OS_PROJECT = {
  platformRaw: {
    $toLower: {
      $trim: { input: { $ifNull: ['$client_info.platform', ''] } },
    },
  },
  osRaw: {
    $toLower: {
      $trim: { input: { $ifNull: ['$client_info.os', ''] } },
    },
  },
};

const HAS_VALID_OS = {
  $not: { $in: ['$osRaw', ['', 'unknown']] },
};

const OS_CLASSIFY_ADD_FIELDS = {
  isIos: {
    $or: [
      { $eq: ['$platformRaw', 'ios'] },
      {
        $and: [
          HAS_VALID_OS,
          { $regexMatch: { input: '$osRaw', regex: 'ios|iphone|ipad' } },
        ],
      },
    ],
  },
  isAndroid: {
    $or: [
      { $eq: ['$platformRaw', 'android'] },
      {
        $and: [
          HAS_VALID_OS,
          { $regexMatch: { input: '$osRaw', regex: 'android' } },
        ],
      },
    ],
  },
};

const OS_KEY_ADD_FIELDS = {
  osKey: {
    $cond: ['$isIos', 'ios', { $cond: ['$isAndroid', 'android', 'other'] }],
  },
};

export async function computeOrderDeviceAnalytics(
  orderModel: Model<any>,
  range: DashboardDateRange,
): Promise<OrderDeviceAnalyticsResult> {
  const { start, end } = range;

  const [facetResult] = await orderModel.aggregate<{
    byDeviceType: DeviceAggregationRow[];
    byOs: OsAggregationRow[];
  }>([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
        order_status: 'Completed',
      },
    },
    {
      $facet: {
        byDeviceType: [
          {
            $project: {
              deviceType: {
                $toLower: {
                  $trim: {
                    input: { $ifNull: ['$client_info.device_type', 'unknown'] },
                  },
                },
              },
              price: { $ifNull: ['$final_order_total', 0] },
              ...CLIENT_PLATFORM_OS_PROJECT,
            },
          },
          { $addFields: { ...OS_CLASSIFY_ADD_FIELDS } },
          {
            $group: {
              _id: '$deviceType',
              totalCount: { $sum: 1 },
              totalPrice: { $sum: '$price' },
              iosCount: { $sum: { $cond: ['$isIos', 1, 0] } },
              androidCount: { $sum: { $cond: ['$isAndroid', 1, 0] } },
              iosPrice: { $sum: { $cond: ['$isIos', '$price', 0] } },
              androidPrice: { $sum: { $cond: ['$isAndroid', '$price', 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ],
        byOs: [
          {
            $project: {
              price: { $ifNull: ['$final_order_total', 0] },
              ...CLIENT_PLATFORM_OS_PROJECT,
            },
          },
          {
            $addFields: {
              ...OS_CLASSIFY_ADD_FIELDS,
              ...OS_KEY_ADD_FIELDS,
            },
          },
          {
            $group: {
              _id: '$osKey',
              totalCount: { $sum: 1 },
              totalPrice: { $sum: '$price' },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const deviceRows = facetResult?.byDeviceType ?? [];
  const osRows = facetResult?.byOs ?? [];

  const deviceStats: Record<string, DeviceStatBucket> = {};
  let totalOrders = 0;

  for (const row of deviceRows) {
    const deviceType = row._id || 'unknown';
    totalOrders += row.totalCount;

    const bucket: DeviceStatBucket = {
      totalCount: row.totalCount,
      totalPrice: roundPrice(row.totalPrice),
    };

    if (row.iosCount > 0 || row.androidCount > 0) {
      bucket.iosCount = row.iosCount;
      bucket.androidCount = row.androidCount;
      bucket.iosPrice = roundPrice(row.iosPrice);
      bucket.androidPrice = roundPrice(row.androidPrice);
    }

    deviceStats[deviceType] = bucket;
  }

  const osStats: Record<string, OsStatBucket> = {};
  for (const row of osRows) {
    osStats[row._id || 'other'] = {
      totalCount: row.totalCount,
      totalPrice: roundPrice(row.totalPrice),
    };
  }

  return { totalOrders, deviceStats, osStats };
}
