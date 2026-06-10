import type { Model } from 'mongoose';
import {
  deliveryDateGte,
  deliveryDateLte,
  type DashboardDateRange,
} from '../helpers/date-range';

export async function computeAutoSelectionCount(
  deliveryModel: Model<any>,
  range: DashboardDateRange,
) {
  const Delivery = deliveryModel;
  const { start, end } = range;

  const matchfilter = {
    delivery_date: {
      $lte: deliveryDateLte(end),
      $gte: deliveryDateGte(start),
    },
    delivery_type: 'subscription',
    not_deliverable: false,
    is_delivery_freezed: false,
  };

  const countFilter = {
    delivery_date: {
      $lte: deliveryDateLte(end),
      $gte: deliveryDateGte(start),
    },
    delivery_type: 'subscription',
    not_deliverable: false,
  };

  const [
    autoSelectionCount,
    manualSelectionCount,
    allMealCount,
    skipDeliveryCount,
    deliveryCount,
  ] = await Promise.all([
    Delivery.aggregate([
      { $match: matchfilter },
      { $unwind: '$delivery_item' },
      { $match: { 'delivery_item.selected_meal.is_auto_select': true } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    Delivery.aggregate([
      { $match: matchfilter },
      { $unwind: '$delivery_item' },
      { $match: { 'delivery_item.selected_meal.is_auto_select': false } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    Delivery.aggregate([
      { $match: matchfilter },
      {
        $group: {
          _id: null,
          totalLength: { $sum: { $size: '$selected_meal' } },
        },
      },
    ]),
    Delivery.countDocuments({ ...countFilter, is_delivery_freezed: true }),
    Delivery.countDocuments({ ...countFilter, is_delivery_freezed: false }),
  ]);

  return {
    selection: {
      auto: autoSelectionCount?.[0]?.count || 0,
      manual: manualSelectionCount?.[0]?.count || 0,
      allMeal: allMealCount?.[0]?.totalLength || 0,
    },
    deliveries: {
      skip: skipDeliveryCount || 0,
      total: deliveryCount || 0,
    },
  };
}
