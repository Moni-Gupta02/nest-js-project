import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import mongoose, { Model, PipelineStage } from 'mongoose';
import { AdminHistoryDocument } from 'src/admin-history/Schema/adminHistory';
import { handleDubai11Time } from 'src/common/utils/helper';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import { AWBDocument } from 'src/pickup-orders/schemas/awb.schema';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { ChangeCalorieRangeDto } from './dto/create-order.dto';
import { ChangeBagBoxDto } from './dto/get-order.dto';
import { orderHistoryDto } from './dto/order-history.dto';
import { OrderDocument } from './schemas/order.schema';
import { OrderHistoryDocument } from './schemas/order_history.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel('Orders') private readonly orderModel: Model<OrderDocument>,
    @InjectModel('OrdersHistory')
    private readonly orderHistoryModel: Model<OrderHistoryDocument>,
    @InjectModel('Subscriptions')
    private readonly subscriptionsModel: Model<SubscriptionDocument>,
    @InjectModel('Deliveries')
    private readonly DeliveriesModel: Model<DeliveryDocument>,
    @InjectModel('admin_history')
    private readonly adminHistoryModel: Model<AdminHistoryDocument>,
    @InjectModel('awbs')
    private readonly awbModel: Model<AWBDocument>,
  ) {}

  async listFailOrders(
    orderType: string,
    limit: string = '10',
    page: string = '1',
    search: string = '',
    startDate: string,
    endDate: string,
    renewal: string,
    dietType: string = '',
    sortBy: string = 'createdAt',
    sortDirection: 'asc' | 'desc' = 'desc',
    deliveryDays?: string,
    planDuration?: string,
    financialStatus?: string,
  ) {
    try {
      const searchNumber = Number(search);
      const offset = (+page - 1) * +limit;
      const firstDate = moment(new Date(startDate))
        .utcOffset(240)
        .startOf('day')
        .toDate();
      const lastDate = moment(new Date(endDate))
        .utcOffset(240)
        .endOf('day')
        .toDate();

      const extraQuery = renewal ? { type_of_order: renewal } : {};

      // Common pipeline stages for both order types
      const commonPipeline: PipelineStage[] = [
        {
          $sort: {
            [sortBy]: sortDirection === 'asc' ? 1 : -1,
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
        {
          $unwind: {
            path: '$customerData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            createdAt: {
              $gte: firstDate,
              $lte: lastDate,
            },
            ...extraQuery,
            order_status: { $nin: ['Ongoing'] },
            order_type:
              orderType.toLowerCase() === 'subscription'
                ? 'subscription'
                : 'NDD',
            $or: [
              { 'customerData.first_name': { $regex: search, $options: 'i' } },
              { 'customerData.last_name': { $regex: search, $options: 'i' } },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: '$order_number' },
                    regex: searchNumber.toString(),
                  },
                },
              },
            ],
          },
        },
        ...(dietType
          ? [
              {
                $match: {
                  'order_item.0.protein_category': {
                    $regex: dietType,
                    $options: 'i',
                  },
                },
              },
            ]
          : []),
        ...(deliveryDays
          ? [
              {
                $match: {
                  'order_item.0.delivery_days': {
                    $regex: deliveryDays,
                    $options: 'i',
                  },
                },
              },
            ]
          : []),
        ...(planDuration
          ? [
              {
                $match: {
                  'order_item.0.plan_duration_in_days': planDuration,
                },
              },
            ]
          : []),
        ...(financialStatus
          ? [
              {
                $match: {
                  financial_status: { $regex: financialStatus, $options: 'i' },
                },
              },
            ]
          : []),

        {
          $group: {
            _id: '$customer_id',
            lastOrder: { $first: '$$ROOT' },
          },
        },
        {
          $match: {
            'lastOrder.order_status': 'Failed',
          },
        },
        {
          $replaceRoot: {
            newRoot: '$lastOrder',
          },
        },
      ];

      // Projection stage
      const projectStage: PipelineStage = {
        $project: {
          'customerData.first_name': 1,
          'customerData.last_name': 1,
          'customerData.country_code': 1,
          'customerData.phone_number': 1,
          'customerData.whatsapp_country_code': 1,
          'customerData.whatsapp_number': 1,
          'customerData._id': 1,
          order_number: 1,
          createdAt: 1,
          delivery_start_date: 1,
          type_of_order: 1,
          final_order_total: 1,
          order_status: 1,
          order_item: 1,
          financial_status: 1,
          order_type: 1,
        },
      };

      const finalPipeline: PipelineStage[] = [
        ...commonPipeline,
        projectStage,
        {
          $facet: {
            data: [{ $skip: Number(offset) }, { $limit: Number(+limit) }],
            totalRecord: [
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ];

      const orderList = await this.orderModel.aggregate(finalPipeline);
      const countValue = orderList[0]?.totalRecord?.[0]?.count || 0;
      let orderNewList = orderList[0]?.data || [];
      // Transform the results
      orderNewList = orderNewList.map((order) => {
        let breakfastCount = 0,
          lunchCount = 0,
          dinnerCount = 0,
          snackCount = 0;
        const proteinCategorySet = new Set();
        if (order.order_item[0]?.selected_meal_type) {
          order.order_item[0]?.selected_meal_type.forEach((meal) => {
            if (meal.meal_type === 'breakfast') breakfastCount += meal.qty || 0;
            if (meal.meal_type === 'lunch') lunchCount += meal.qty || 0;
            if (meal.meal_type === 'dinner') dinnerCount += meal.qty || 0;
            if (['morning_snack', 'evening_snack'].includes(meal.meal_type))
              snackCount += meal.qty || 0;

            // 4. Add the specific category field (e.g., protein_category) to the Set
            if (meal?.protein_category) {
              proteinCategorySet.add(meal?.protein_category ?? 'balance');
            }
          });
        }

        return {
          _id: order._id,
          customer_id: order.customerData._id,
          type_of_order: order.type_of_order,
          final_order_total: order.final_order_total,
          order_status: order.order_status,
          financial_status: order.financial_status || null,
          order_number: order.order_number || null,
          createdAt: order.createdAt,
          order_type: order.order_type,
          customer_full_name: `${order.customerData.first_name} ${order.customerData.last_name}`,
          phone: `${order.customerData.country_code} ${order.customerData.phone_number}`,
          whatsapp: `${order.customerData.whatsapp_country_code} ${order.customerData.whatsapp_number}`,
          delivery_days: order.order_item[0]?.delivery_days || 'N/A',
          plan_type: order.order_item[0]?.plan_type || 'N/A',
          plan_duration: order.order_item[0]?.plan_duration_in_days || 'N/A',
          delivery_start_date: order.delivery_start_date,
          Plan: `${breakfastCount > 0 ? `${breakfastCount}B ` : ''}${lunchCount > 0 ? `${lunchCount}L ` : ''}${dinnerCount > 0 ? `${dinnerCount}D ` : ''}${snackCount > 0 ? `${snackCount}S` : ''}`.trim(),
          category: order.order_type,
          end_date: order.order_item[0]?.end_date || 'N/A',
          diet_type: Array.from(proteinCategorySet).join(', ') || 'N/A',
        };
      });

      return {
        list: orderNewList,
        count: countValue,
        currentPage: +page,
        totalPages: Math.ceil(countValue / Number(limit)) || 0,
      };
    } catch (error) {}
  }
  planMap = {
    BYO: 'flexi',
    ESSENTIAL: 'smart_saver',
    subscription: 'normal',
  };
  async listAllOrders(
    orderType: string,
    limit: string = '10',
    page: string = '1',
    search: string = '',
    startDate: string,
    endDate: string,
    orderStatus: string,
    renewal: string,
    dietType: string = '',
    sortBy: string = 'createdAt',
    sortDirection: 'asc' | 'desc' = 'desc',
    deliveryDays?: string,
    planDuration?: string,
    financialStatus?: string,
    goalType?: string,
  ) {
    try {
      const searchNumber = Number(search);
      const queryObject: any = {};

      // Only add financial_status if order is not Failed
      if (orderStatus !== 'Failed') {
        queryObject.financial_status = 'Paid';
      }

      // Build the base match query
      const matchQuery: any = {
        createdAt: {
          $gte: moment(new Date(startDate))
            .utcOffset(240)
            .startOf('day')
            .toDate(),
          $lte: moment(new Date(endDate)).utcOffset(240).endOf('day').toDate(),
        },
        ...(orderType !== 'all' && {
          'subscriptionData.plan':
            // orderType === 'BYO'
            //   ? 'flexi'
            orderType === 'essential'
              ? 'smart_saver'
              : // : orderType === 'subscription'
                //   ? 'normal'
                orderType === 'performance'
                ? { $ne: 'smart_saver' } // New Case
                : orderType,
        }),
        ...(renewal && { type_of_order: renewal }),
        $or: [
          {
            ['customerData.first_name']: {
              $regex: search || '',
              $options: 'i',
            },
          },
          {
            ['customerData.last_name']: { $regex: search || '', $options: 'i' },
          },
          {
            $and: [
              {
                ['customerData.first_name']: {
                  $regex: search.split(' ')?.[0] || '',
                  $options: 'i',
                },
              },
              {
                ['customerData.last_name']: {
                  $regex: search.split(' ')?.[1] || '',
                  $options: 'i',
                },
              },
            ],
          },
          {
            $and: [
              {
                ['customerData.first_name']: {
                  $regex: search.split(' ')?.[1] || '',
                  $options: 'i',
                },
              },
              {
                ['customerData.last_name']: {
                  $regex: search.split(' ')?.[0] || '',
                  $options: 'i',
                },
              },
            ],
          },
          {
            $expr: {
              $regexMatch: {
                input: { $toString: '$order_number' },
                regex: searchNumber.toString(),
              },
            },
          },
        ],
        ...queryObject,
      };

      // Handle order status conditions
      if (orderStatus === 'Active') {
        matchQuery['subscriptionData.delivery_start_date'] = {
          $lte: moment(new Date()).startOf('day').toDate(),
        };
        matchQuery['subscriptionData.end_date'] = {
          $gte: moment(new Date()).endOf('day').toDate(),
        };
        matchQuery.order_status = { $regex: 'Completed', $options: 'i' };
      } else if (orderStatus === 'Active/Partial') {
        matchQuery['subscriptionData.delivery_start_date'] = {
          $lte: moment(new Date()).startOf('day').toDate(),
        };
        matchQuery['subscriptionData.end_date'] = {
          $gte: moment(new Date()).endOf('day').toDate(),
        };
        matchQuery.order_status = {
          $regex: 'Partially_Cancelled',
          $options: 'i',
        };
      } else if (orderStatus === 'Upcoming') {
        matchQuery['subscriptionData.delivery_start_date'] = {
          $gt: moment(new Date()).endOf('day').toDate(),
        };
        matchQuery.order_status = { $regex: 'Completed', $options: 'i' };
      } else if (orderStatus === 'Upcoming/Partial') {
        matchQuery['subscriptionData.delivery_start_date'] = {
          $gt: moment(new Date()).endOf('day').toDate(),
        };
        matchQuery.order_status = 'Partially_Cancelled';
      } else if (orderStatus === 'Completed') {
        matchQuery['subscriptionData.end_date'] = {
          $lt: moment(new Date()).startOf('day').toDate(),
        };
        matchQuery.order_status = { $regex: 'Completed', $options: 'i' };
      } else if (orderStatus === 'Cancelled') {
        matchQuery.order_status = 'Cancelled';
      } else if (orderStatus === 'Failed') {
        matchQuery.order_status = 'Failed';
        delete matchQuery.financial_status;
      } else if (orderStatus === 'Cancelled/Partial') {
        matchQuery['subscriptionData.end_date'] = {
          $lt: moment(new Date()).startOf('day').toDate(),
        };
        matchQuery.order_status = 'Partially_Cancelled';
      }
      if (goalType) {
        if (goalType === 'BYO') {
          // If goal is BYO, we ignore the 'customer_goal' field
          // and filter strictly by the BYO plan name.
          matchQuery['subscriptionData.plan'] = 'flexi';
        } else {
          // Standard behavior for PCOS, Diabetes, etc.
          matchQuery.customer_goal = goalType;
        }
      }
      // Add diet type filter if provided
      if (dietType) {
        matchQuery['subscriptionData.selected_meal_type'] = {
          $elemMatch: { protein_category: dietType },
        };
      }

      // Add delivery days filter if provided
      if (deliveryDays) {
        matchQuery['subscriptionData.delivery_duration'] =
          deliveryDays.toString();
      }

      // Add plan duration filter if provided
      if (planDuration) {
        matchQuery['subscriptionData.plan_duration_in_days'] = planDuration;
      }

      const pipeline: PipelineStage[] = [
        {
          $sort: {
            [this.getSortField(sortBy)]: sortDirection === 'asc' ? 1 : -1,
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
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscription_id',
            foreignField: '_id',
            as: 'subscriptionData',
          },
        },
        {
          $unwind: {
            path: '$subscriptionData',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: matchQuery },
        {
          $project: {
            createdAt: '$createdAt',
            order_number: 1,
            type_of_order: 1,
            order_type: {
              $switch: {
                branches: [
                  // {
                  //   case: { $eq: ['$subscriptionData.plan', 'flexi'] },
                  //   then: 'BYO',
                  // },
                  {
                    case: { $eq: ['$subscriptionData.plan', 'smart_saver'] },
                    then: 'Essential',
                  },
                  // If the plan is NOT smart_saver, categorize as Performance
                  {
                    case: { $ne: ['$subscriptionData.plan', 'smart_saver'] },
                    then: 'Performance',
                  },
                  // {
                  //   case: { $eq: ['$subscriptionData.plan', 'normal'] },
                  //   then: 'Subscription',
                  // },
                ],
                default: '$order_type',
              },
            },
            customer_id: 1,
            customer_full_name: {
              $concat: [
                {
                  $toString: { $arrayElemAt: ['$customerData.first_name', 0] },
                },
                ' ',
                { $toString: { $arrayElemAt: ['$customerData.last_name', 0] } },
              ],
            },
            phone: {
              $concat: [
                {
                  $toString: {
                    $arrayElemAt: ['$customerData.country_code', 0],
                  },
                },
                ' ',
                {
                  $toString: {
                    $arrayElemAt: ['$customerData.phone_number', 0],
                  },
                },
              ],
            },
            whatsapp: {
              $concat: [
                {
                  $toString: {
                    $arrayElemAt: ['$customerData.whatsapp_country_code', 0],
                  },
                },
                ' ',
                {
                  $toString: {
                    $arrayElemAt: ['$customerData.whatsapp_number', 0],
                  },
                },
              ],
            },
            final_order_total: 1,
            delivery_days: { $ifNull: ['$subscriptionData.delivery_days', ''] },
            plan_type: { $ifNull: ['$subscriptionData.plan_type', ''] },
            plan_duration: {
              $ifNull: ['$subscriptionData.plan_duration_in_days', ''],
            },
            order_status: 1,
            financial_status: 1,
            delivery_start_date: {
              $cond: {
                if: { $eq: ['$order_type', 'NDD'] },
                then: { $ifNull: ['$delivery_start_date', ''] },
                else: {
                  $ifNull: ['$subscriptionData.delivery_start_date', ''],
                },
              },
            },
            plan: {
              $cond: {
                if: { $eq: ['$order_type', 'NDD'] },
                then: {
                  $map: {
                    input: '$order_item',
                    as: 'item',
                    in: {
                      meal_category: '$$item.meal_category',
                      qty: '$$item.qty',
                    },
                  },
                },
                else: {
                  $map: {
                    input: {
                      $reduce: {
                        input: '$order_item',
                        initialValue: [],
                        in: {
                          $concatArrays: [
                            '$$value',
                            [
                              {
                                meal_category: '$$this.selected_meal_type',
                                total: '$$this.qty',
                              },
                            ],
                          ],
                        },
                      },
                    },
                    as: 'meal',
                    in: {
                      meal_category: '$$meal.meal_category',
                      total: '$$meal.total',
                    },
                  },
                },
              },
            },
            end_date: {
              $cond: {
                if: { $eq: ['$order_type', 'NDD'] },
                then: { $ifNull: ['$end_date', ''] },
                else: { $ifNull: ['$subscriptionData.end_date', ''] },
              },
            },
            diet_type: {
              $let: {
                vars: {
                  // 1. Get unique categories first using $setUnion
                  uniqueCategories: {
                    $setUnion: [
                      {
                        $ifNull: [
                          '$subscriptionData.selected_meal_type.protein_category',
                          ['balance'],
                        ],
                      },
                      [], // Union with empty array returns the unique set of the first array
                    ],
                  },
                },
                in: {
                  $reduce: {
                    input: '$$uniqueCategories',
                    initialValue: '',
                    in: {
                      $let: {
                        vars: {
                          // 2. Map the unique keys to display names
                          mappedName: {
                            $switch: {
                              branches: [
                                {
                                  case: { $eq: ['$$this', 'balance'] },
                                  then: 'Balanced',
                                },
                                {
                                  case: { $eq: ['$$this', 'low'] },
                                  then: 'Low Carb',
                                },
                                {
                                  case: { $eq: ['$$this', 'diabetes'] },
                                  then: 'Diabetes',
                                },
                                {
                                  case: { $eq: ['$$this', 'pcos'] },
                                  then: 'PCOS',
                                },
                                {
                                  case: { $eq: ['$$this', 'vegetarian'] },
                                  then: 'Vegetarian',
                                },
                                {
                                  case: { $eq: ['$$this', 'smart_saver'] },
                                  then: 'Essential',
                                },
                              ],
                              default: '$$this',
                            },
                          },
                        },
                        in: {
                          // 3. Concatenate only unique mapped names
                          $cond: {
                            if: { $eq: ['$$value', ''] },
                            then: '$$mappedName',
                            else: {
                              $concat: ['$$value', ', ', '$$mappedName'],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            goal: {
              $cond: {
                // 1. Check if the plan is BYO (flexi) first
                if: { $eq: ['$subscriptionData.plan', 'flexi'] },
                then: 'BYO',
                // 2. Otherwise, run your existing logic
                else: {
                  $let: {
                    vars: {
                      goalValue: {
                        $ifNull: [
                          '$customer_goal',
                          '$subscriptionData.customer_goal',
                        ],
                      },
                    },
                    in: {
                      $switch: {
                        branches: [
                          {
                            case: { $eq: ['$$goalValue', 'BYO'] },
                            then: 'BYO',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'pcos'] },
                            then: 'PCOS',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'diabetes'] },
                            then: 'Diabetes',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'weight_loss'] },
                            then: 'Weight Loss',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'weight_gain'] },
                            then: 'Weight Gain',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'muscle_gain'] },
                            then: 'Muscle Gain',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'maintenance'] },
                            then: 'Maintenance',
                          },
                          {
                            case: { $eq: ['$$goalValue', 'healthy_eating'] },
                            then: 'Healthy Eating',
                          },
                        ],
                        default: {
                          $cond: {
                            if: { $eq: ['$$goalValue', null] },
                            then: 'N/A',
                            else: '$$goalValue',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        {
          $facet: {
            data: [
              { $skip: (Number(page) - 1) * Number(limit) },
              { $limit: Number(limit) },
            ],
            totalRecord: [{ $group: { _id: null, count: { $sum: 1 } } }],
          },
        },
      ];

      const orderList = await this.orderModel.aggregate(pipeline);
      const countValue = orderList?.[0]?.totalRecord?.[0]?.count || 0;
      const orderNewList = orderList?.[0]?.data || [];

      return {
        list: orderNewList,
        count: countValue,
        currentPage: Number(page),
        totalPages: Math.ceil(countValue / Number(limit)) || 0,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  private getSortField(field: string): string {
    const sortFieldMap: { [key: string]: string } = {
      createdAt: 'createdAt',
      order_number: 'order_number',
      final_order_total: 'final_order_total',
      delivery_start_date: 'delivery_start_date',
      end_date: 'end_date',
      order_status: 'order_status',
      financial_status: 'financial_status',
    };
    return sortFieldMap[field] || 'createdAt';
  }

  private getPlanProjection() {
    return {
      $cond: {
        if: { $eq: ['$order_type', 'NDD'] },
        then: {
          $map: {
            input: '$order_item',
            as: 'item',
            in: {
              meal_category: '$$item.meal_category',
              qty: '$$item.qty',
            },
          },
        },
        else: {
          $map: {
            input: '$subscriptionData.selected_meal_type',
            as: 'meal',
            in: {
              meal_category: '$$meal.meal_category',
              total: '$$meal.qty',
            },
          },
        },
      },
    };
  }

  async getCustomerPageOrderList(body: any) {
    const { type, customer_id, orderType, limit, offset } = body;
    let queryPayload: any = {};

    if (orderType === 'Meal Plan Orders') {
      queryPayload = {
        customer_id: new mongoose.Types.ObjectId(customer_id),
        order_type: 'subscription',
        financial_status: 'Paid',
      };
      if (type === 'notall') {
        queryPayload['order_status'] = {
          $in: ['Completed', 'Partially_Cancelled'],
          $nin: ['Failed', 'Ongoing'],
        };
      }
    }

    const orders = await this.orderModel
      .find(queryPayload)
      .limit(Number(+limit))
      .skip(Number(+offset))
      .sort({ createdAt: -1 })
      .populate('subscription_id')
      .lean();
    const count = await this.orderModel.countDocuments(queryPayload);

    const transformedOrders = await Promise.all(
      orders.map(async (order: any) => {
        const subscription: any = order.subscription_id || {};
        const selectedMealType = subscription.selected_meal_type?.[0] || {};
        const proteinCategorySet = new Set();
        const proteinKcalSet = new Set();
        let breakfastCount = 0,
          lunchCount = 0,
          dinnerCount = 0,
          snackCount = 0;

        if (subscription.selected_meal_type) {
          subscription.selected_meal_type.forEach((meal) => {
            if (meal.meal_type === 'breakfast') breakfastCount += meal.qty || 0;
            if (meal.meal_type === 'lunch') lunchCount += meal.qty || 0;
            if (meal.meal_type === 'dinner') dinnerCount += meal.qty || 0;
            if (['morning_snack', 'evening_snack'].includes(meal.meal_type))
              snackCount += meal.qty || 0;

            // 4. Add the specific category field (e.g., protein_category) to the Set
            if (meal?.protein_category) {
              proteinCategorySet.add(meal?.protein_category ?? 'balance');
            }
            if (meal?.kcal) {
              proteinKcalSet.add(meal?.kcal ?? 'N/A');
            }
          });
        }

        const today = moment().startOf('day');
        const startDate = moment(subscription.delivery_start_date).startOf(
          'day',
        );
        const endDate = moment(subscription.end_date).startOf('day');

        let status = '';
        if (
          startDate.isAfter(today) &&
          order.financial_status === 'Paid' &&
          (order.order_status === 'Completed' ||
            order.order_status === 'Partially_Cancelled')
        ) {
          status =
            order.order_status === 'Partially_Cancelled'
              ? 'Upcoming/Partial'
              : 'Upcoming';
        } else if (
          endDate.isBefore(today) &&
          order.financial_status === 'Paid' &&
          (order.order_status === 'Completed' ||
            order.order_status === 'Partially_Cancelled')
        ) {
          status =
            order.order_status === 'Partially_Cancelled'
              ? 'Completed/Partial'
              : 'Completed';
        } else if (
          startDate.isSameOrBefore(today) &&
          endDate.isSameOrAfter(today) &&
          order.financial_status === 'Paid' &&
          (order.order_status === 'Completed' ||
            order.order_status === 'Partially_Cancelled')
        ) {
          status =
            order.order_status === 'Partially_Cancelled'
              ? 'Active/Partial'
              : 'Active';
        } else if (order.order_status === 'Cancelled') {
          status = 'Cancelled';
        } else {
          status = 'Unknown';
        }

        const paymentHistory = await this.getLatestPaymentSummary(
          customer_id,
          order?.order_type,
          subscription?._id,
        );
        return {
          subscriptionId: subscription._id,
          orderId: order._id,
          Date: order.createdAt,
          Order: order.order_number,
          OrderType: order.order_type,
          Status: status,
          Type: subscription.plan_type || 'N/A',
          // Size: selectedMealType.kcal || 'N/A',
          Size: Array.from(proteinKcalSet).join(', ') || 'N/A',
          diet_type: Array.from(proteinCategorySet).join(', ') || 'N/A',
          planDurationInDays: subscription?.plan_duration_in_days,
          Plan: `${breakfastCount > 0 ? `${breakfastCount}B ` : ''}${lunchCount > 0 ? `${lunchCount}L ` : ''}${dinnerCount > 0 ? `${dinnerCount}D ` : ''}${snackCount > 0 ? `${snackCount}S` : ''}`.trim(),
          DeliverableDays: subscription.delivery_days || 0,
          Bag: subscription.is_refundable
            ? 'Chiller Bag'
            : subscription?.bag_info?.name || 'Styrofoam Box',
          StartDate: subscription.delivery_start_date,
          EndDate: subscription.end_date,
          Value: `AED ${order.final_order_total}`,
          Category: order.is_flex_plan ? 'BYO' : order.order_category,
          Goal: order?.customer_goal || subscription?.customer_goal || 'N/A',
          avoidIngredients: subscription?.avoid_ingredients || [],
          PaymentHistory: paymentHistory,
          selected_meal_type: subscription.selected_meal_type,
          subscriptionData: subscription,
        };
      }),
    );

    return {
      orderList: transformedOrders,
      count,
    };
  }

  async getLatestPaymentSummary(
    customerId: string,
    orderType: string,
    subscriptionId?: string, // Optional parameter
  ) {
    try {
      const query: any = {
        customer_id: new mongoose.Types.ObjectId(customerId),
        order_type: orderType,
      };

      // Add subscriptionId filter if provided
      if (subscriptionId) {
        query.subscription_id = new mongoose.Types.ObjectId(subscriptionId);
      }
      console.log(query, '--query');
      // Fetch the latest payment summary
      const latestPaymentSummary = await this.orderModel
        .find(query)
        .limit(1)
        .sort('-updatedAt')
        .select(
          'refundable_deposite order_status order_total discount order_subtotal order_vat cancellation_details order_vat_value shipping_charge coupon_id final_order_total referral_discount is_used_reward_wallet redeem_amount_wallet addon_discount updatedAt',
        )
        .populate({
          path: 'coupon_id',
          select: 'name description discount_value discount_type coupon_code',
        })
        .lean();
      console.log(latestPaymentSummary, '---latestPaymentSummary');
      if (!latestPaymentSummary.length) {
        return [];
      }

      const summary = latestPaymentSummary[0];

      // Format the response
      const formattedResponse = {
        order_total: summary.order_total || '--',
        order_status: summary.order_status || '--',
        discountArray: summary.addon_discount || [],
        discount: summary.discount || '--',
        coupon_id: summary.coupon_id || null,
        referral_discount: summary.referral_discount || 0,
        order_subtotal: summary.order_subtotal || '--',
        shipping_charge: summary.shipping_charge || 0,
        order_vat: summary.order_vat || 0,
        order_vat_value: summary.order_vat_value || 0,
        redeem_amount_wallet: summary.redeem_amount_wallet || '--',
        is_used_reward_wallet: summary.is_used_reward_wallet || false,
        refundable_deposite: summary.refundable_deposite || '--',
        final_order_total: summary.final_order_total || '--',
        cancellation_details: summary.cancellation_details || '--',
      };

      return formattedResponse;
    } catch (error) {
      console.error('Error fetching latest payment summary:', error);
      throw new Error('Failed to fetch the latest payment summary');
    }
  }

  async changeCalorieRange(
    body: ChangeCalorieRangeDto,
  ): Promise<{ success: boolean }> {
    try {
      const { order_id, subscription_id, kcal_range, kcal, endDate } = body;
      console.log(body, '--body');
      // Parse delivery date logic
      const todayDate = new Date();
      const deliveryDate =
        todayDate.getHours() < 12
          ? moment(todayDate.setDate(todayDate.getDate() + 2))
              .startOf('day')
              .toDate()
          : moment(todayDate.setDate(todayDate.getDate() + 3))
              .startOf('day')
              .toDate();
      console.log(
        deliveryDate,
        '        deliveryDate <= moment',
        moment(endDate, 'MM/DD/YYYY').startOf('day').toDate(),
      );
      if (
        deliveryDate <= moment(endDate, 'MM/DD/YYYY').startOf('day').toDate()
      ) {
        // Update order items
        const orderData = await this.orderModel
          .findById(order_id, {
            order_item: 1,
          })
          .lean();
        console.log(orderData, '--orderData');
        const updatedOrderItems = (orderData?.order_item as any[])?.map(
          (orderItem: any) => {
            orderItem.selected_meal_type = orderItem.selected_meal_type?.map(
              (mealType: any) => {
                mealType.kcal_range = kcal_range;
                mealType.kcal = kcal;
                return mealType;
              },
            );
            return orderItem;
          },
        );
        console.log(updatedOrderItems, '--updatedOrderItems');

        // Update order document
        await this.orderModel.findByIdAndUpdate(order_id, {
          order_item: updatedOrderItems,
        });

        // Update subscription document
        await this.subscriptionsModel.updateOne(
          { _id: new mongoose.Types.ObjectId(subscription_id) },
          {
            $set: {
              'selected_meal_type.$[].kcal_range': kcal_range,
              'selected_meal_type.$[].kcal': kcal,
            },
          },
        );

        // Update future deliveries
        await this.DeliveriesModel.updateMany(
          {
            subscription_id: new mongoose.Types.ObjectId(subscription_id),
            delivery_date: {
              $gte: new Date(
                moment(new Date(deliveryDate)).format(
                  'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
                ),
              ),
            },
          },
          {
            $set: {
              'selected_meal_type.$[].kcal_range': kcal_range,
              'selected_meal_type.$[].kcal': kcal,
            },
          },
        );
      }

      return;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  async getOrderHistory(body: orderHistoryDto): Promise<any> {
    try {
      console.log('body', body);
      const { customer_id, order_id } = body;
      const orderHistory = await this.orderHistoryModel
        .find({
          customer_id: new mongoose.Types.ObjectId(customer_id),
          order_id: new mongoose.Types.ObjectId(order_id),
        })
        .sort({ createdAt: -1 });
      return orderHistory;
    } catch (err) {
      console.error(err);
    }
  }

  async addCoolerBag(customer_id: string): Promise<any> {
    try {
      console.log('customer_id', customer_id);
      const startOfDay = moment().startOf('day').toISOString();

      const toCreateHistoryOrNot = await this.subscriptionsModel.find({
        end_date: { $gte: new Date(startOfDay) },
        is_cancle: false,
        customer_id: new mongoose.Types.ObjectId(customer_id),
        is_refundable: false,
      });

      // Update subscriptions
      await this.subscriptionsModel.updateMany(
        {
          end_date: { $gte: new Date(startOfDay) },
          is_cancle: false,
          customer_id: new mongoose.Types.ObjectId(customer_id),
        },
        {
          $set: { is_refundable: true },
        },
      );

      // Fetch orders data
      const ordersData = await this.subscriptionsModel
        .find(
          {
            end_date: { $gte: new Date(startOfDay) },
            is_cancle: false,
            customer_id: new mongoose.Types.ObjectId(customer_id),
          },
          { _id: 1, order_id: 1, end_date: 1 },
        )
        .sort('end_date')
        .limit(1);

      const dateVary = handleDubai11Time(1);

      // Update AWB data
      await this.awbModel.updateMany(
        {
          'refund_bag_details.customer_id': customer_id,
          transcorp_date: { $gte: dateVary },
        },
        {
          $set: {
            'refund_bag_details.customerDetails.$[element].bag_opted': true,
          },
        },
        {
          arrayFilters: [{ 'element.customer_id': customer_id }],
        },
      );

      // Update refundable deposit if orders exist
      if (ordersData.length > 0) {
        await this.orderModel.findByIdAndUpdate(
          new mongoose.Types.ObjectId(ordersData[0].order_id),
          {
            refundable_deposite: 100,
          },
        );
      }

      if (toCreateHistoryOrNot.length > 0) {
        const payload1 = {
          customer_id: new mongoose.Types.ObjectId(customer_id) || null,
          order_id:
            new mongoose.Types.ObjectId(toCreateHistoryOrNot?.[0]?.order_id) ||
            null,
          subscription_id:
            new mongoose.Types.ObjectId(toCreateHistoryOrNot?.[0]?._id) || null,
          amount: 100,
          is_credit: true,
          payment_status: 'Success',
          payment_type: 'Cooler Bag',
          details: {},
        };
        await this.orderHistoryModel.create(payload1);
      }
      return;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async replaceBagBox(
    customer_id: string,
    body: ChangeBagBoxDto,
  ): Promise<any> {
    try {
      console.log('customer_id', body);
      const startOfDay = moment().startOf('day').toISOString();
      console.log('startOfDay', startOfDay);
      const subscriptionsToUpdate: any = await this.subscriptionsModel
        .find({
          end_date: { $gte: new Date(startOfDay) },
          is_cancle: false,
          customer_id: new mongoose.Types.ObjectId(customer_id),
          is_refundable: false,
          $or: [{ slot: '9AM - 12PM' }, { slot: '9AM - 1PM' }],
        })
        .populate('address_id') // assuming address_id is the path
        .lean();
      console.log('susbsdahsdhjfda', subscriptionsToUpdate);
      let matchingIds = subscriptionsToUpdate
        .filter((sub) => sub.address_id?.city === 'Dubai')
        .map((sub) => sub.order_id);

      if (matchingIds.length === 0) {
        throw new Error(`Can't change bag/box in this city or time slot`);
      }
      // Update subscriptions
      console.log('matchingIds', matchingIds);
      await this.subscriptionsModel.updateMany(
        { order_id: { $in: matchingIds } },
        {
          $set: {
            'bag_info.name': body?.bag_type,
          },
        },
      );

      const dateVary = handleDubai11Time(1);
      matchingIds = [
        ...matchingIds,
        ...matchingIds?.map((matchId) => matchId.toString()),
      ];
      console.log('matchingIds final', matchingIds);
      // Update AWB data
      await this.awbModel.updateMany(
        {
          'refund_bag_details.order_id': { $in: matchingIds },
          transcorp_date: { $gte: dateVary },
        },
        {
          $set: {
            'refund_bag_details.customerDetails.$[element].bag_type':
              body?.bag_type,
          },
        },
        {
          arrayFilters: [
            {
              'element.customer_id': customer_id,
              $or: [
                { 'element.bag_opted': false },
                { 'element.bag_opted': 'No' },
              ],
            },
          ],
        },
      );

      return;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}
