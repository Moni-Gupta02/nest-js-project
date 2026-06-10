import * as moment from 'moment';
import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeUpsellingAnalysis(
  orderModel: Model<any>,
  subscriptionPricesModel: Model<any>,
  subscriptionFixPricesModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const SubscriptionPrice = subscriptionPricesModel;
  const SubscriptionFixPrice = subscriptionFixPricesModel;
  const { start, end } = range;
  const subscriptionMatch = {
    createdAt: { $gte: start, $lte: end },
    order_status: 'Completed',
    financial_status: 'Paid',
    order_type: 'subscription',
  };

  const [totalOrderCount, croClickedCount, upSellingOrders, subscriptionPriceData, subscriptionFixPriceData] =
    await Promise.all([
      Order.countDocuments(subscriptionMatch),
      Order.countDocuments({ ...subscriptionMatch, offer_click_count: { $gt: 0 } }),
      Order.aggregate([
        {
          $match: {
            ...subscriptionMatch,
            'addon_discount.offer_type': 'up_selling',
          },
        },
        {
          $lookup: {
            from: 'customeroffers',
            localField: 'customer_id',
            foreignField: 'customer_id',
            as: 'customerOfferDetails',
          },
        },
      ]),
      SubscriptionPrice.find({ meal_tag: 'None', number_of_meal: '1' }),
      SubscriptionFixPrice.find({}),
    ]);

  const upSellingSales: Record<string, number> = {
    total_orders: totalOrderCount,
    cro_clicked_count: croClickedCount,
    cro_taken: 0,
    cro_clicked_but_not_taken: 0,
    add_on_sales: 0,
    add_on_discount: 0,
    average_order_value_before_cro: 0,
    average_order_value_after_cro: 0,
    eligible_cro_count: 0,
    eligible_cro_but_not_taken: 0,
  };

  const alreadyTakenCroCustomerTemp: unknown[] = [];

  upSellingOrders?.forEach((itm: any) => {
    let finalTotal: number = itm?.final_order_total;
    if (itm?.refundable_deposite) {
      finalTotal -= parseFloat(itm.refundable_deposite);
    }
    upSellingSales.cro_taken += 1;
    alreadyTakenCroCustomerTemp.push(itm?.customer_id);

    const finalSubsPriceIndex = subscriptionPriceData?.findIndex(
      (dataItm: any) =>
        dataItm.meal_type === itm?.order_item?.[0]?.selected_meal_type?.[0]?.kcal_range,
    );

    itm?.addon_discount?.forEach((disItm: any) => {
      let finalrate = 0;

      if (disItm?.offer_type === 'up_selling') {
        if (disItm?.discount_type === 'lunch' || disItm?.discount_type === 'dinner') {
          finalrate += parseFloat(
            subscriptionPriceData?.[finalSubsPriceIndex]?.[
              `day_${itm?.order_item?.[0]?.plan_duration_in_days}`
            ] || 0,
          );
        } else if (disItm?.discount_type === 'breakfast') {
          finalrate +=
            parseFloat(itm?.order_item?.[0]?.plan_duration_in_days) *
            parseFloat(subscriptionFixPriceData?.[0]?.breakfast || 25);
        } else if (disItm?.discount_type === '1_snack') {
          finalrate +=
            parseFloat(itm?.order_item?.[0]?.plan_duration_in_days) *
            parseFloat(subscriptionFixPriceData?.[0]?.evening_snack || 12);
        } else if (disItm?.discount_type === '2_snack') {
          finalrate +=
            parseFloat(itm?.order_item?.[0]?.plan_duration_in_days) *
            (parseFloat(subscriptionFixPriceData?.[0]?.evening_snack || 12) * 2);
        } else if (disItm?.discount_type === 'all_meal') {
          itm?.customerOfferDetails?.[0]?.non_selected_meal?.forEach((nonSlItm: string) => {
            if (nonSlItm === 'breakfast') {
              finalrate +=
                parseFloat(itm?.order_item?.[0]?.plan_duration_in_days) *
                parseFloat(subscriptionFixPriceData?.[0]?.breakfast || 25);
            } else if (nonSlItm === 'morning_snack' || nonSlItm === 'evening_snack') {
              finalrate +=
                parseFloat(itm?.order_item?.[0]?.plan_duration_in_days) *
                parseFloat(subscriptionFixPriceData?.[0]?.evening_snack || 12);
            } else if (nonSlItm === 'lunch' || nonSlItm === 'dinner') {
              finalrate += parseFloat(
                subscriptionPriceData?.[finalSubsPriceIndex]?.[
                  `day_${itm?.order_item?.[0]?.plan_duration_in_days}`
                ] || 0,
              );
            }
          });
        }
        finalrate -= parseFloat(disItm.discount);

        upSellingSales.add_on_discount += parseFloat(disItm.discount);
        upSellingSales.add_on_sales += parseFloat(String(finalrate));
      }
    });
  });

  upSellingSales.cro_clicked_but_not_taken = Math.abs(
    Number(croClickedCount) - Number(upSellingSales.cro_taken),
  );
  upSellingSales.eligible_cro_count = Number(upSellingSales.cro_taken);

  const averageOrderValues = await Order.aggregate([
    {
      $match: {
        $or: [
          { createdAt: { $lt: new Date('2024-08-13T12:30:00.000Z') } },
          { createdAt: { $gte: start, $lte: end } },
        ],
        order_status: 'Completed',
        financial_status: 'Paid',
        order_type: 'subscription',
      },
    },
    {
      $group: {
        _id: null,
        avg_order_value_before_cro: {
          $avg: {
            $cond: [
              { $lt: ['$createdAt', new Date('2024-08-13T12:30:00.000Z')] },
              '$final_order_total',
              null,
            ],
          },
        },
        avg_order_value_after_cro: {
          $avg: {
            $cond: [
              {
                $and: [
                  { $gte: ['$createdAt', moment(start).startOf('day').toDate()] },
                  { $lte: ['$createdAt', end] },
                ],
              },
              '$final_order_total',
              '$$REMOVE',
            ],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        avg_order_value_before_cro: { $round: ['$avg_order_value_before_cro', 2] },
        avg_order_value_after_cro: { $round: ['$avg_order_value_after_cro', 2] },
      },
    },
  ]);

  upSellingSales.average_order_value_before_cro =
    averageOrderValues?.[0]?.avg_order_value_before_cro ?? 0;
  upSellingSales.average_order_value_after_cro =
    averageOrderValues?.[0]?.avg_order_value_after_cro ?? 0;

  let startDateTemp: Date;
  if (moment(start).startOf('day').toDate() > new Date('2024-08-13T12:30:00.000+00:00')) {
    startDateTemp = moment(start).startOf('day').toDate();
  } else {
    startDateTemp = new Date('2024-08-13T12:30:00.000+00:00');
  }

  const eligibleCroCount = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDateTemp, $lte: end },
        order_status: 'Completed',
        financial_status: 'Paid',
        order_type: 'subscription',
        'addon_discount.offer_type': { $ne: 'up_selling' },
        customer_ids: { $nin: alreadyTakenCroCustomerTemp },
      },
    },
    { $unwind: { path: '$order_item', preserveNullAndEmptyArrays: true } },
    {
      $match: {
        $expr: { $lt: [{ $size: '$order_item.selected_meal' }, 5] },
      },
    },
    { $group: { _id: '$customer_id' } },
    { $group: { _id: null, count: { $sum: 1 } } },
  ]);

  upSellingSales.eligible_cro_count += Number(eligibleCroCount?.[0]?.count || 0);
  upSellingSales.eligible_cro_but_not_taken =
    Number(upSellingSales.eligible_cro_count) - Number(upSellingSales.cro_taken);

  return upSellingSales;
}
