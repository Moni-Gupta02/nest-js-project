/* eslint-disable prefer-const */
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
import * as moment from 'moment';
import mongoose, { Model } from 'mongoose';
import { AddressDocument } from 'src/address/schemas/address.schema';
import { AdminHistoryDocument } from 'src/admin-history/Schema/adminHistory';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { DumpDeliveriesDocument } from 'src/common/schema/dump_deliveries';
import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import { minimum11AmCutoff } from 'src/common/utils/helper';
import { DeliverySlot } from 'src/delivery-slot/schemas/delivery-slot.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { OrderDocument } from 'src/order/schemas/order.schema';
import { AWBDocument } from 'src/pickup-orders/schemas/awb.schema';
import { RecipeRatingDocument } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { DishReportDto } from 'src/reports/dto/reports.dto';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { AddSaturdayDeliveryDto } from './dto/add-saturday-delivery.dto';
import {
  AutoSelectionDeliveryDto,
  ChangeDeliveryAddressDto,
  FilterCitiesDto,
  FreezeDeliveryDto,
  UnfreezeDeliveryDto,
} from './dto/extend-delivery.dto';
import { DeliveryDocument } from './schemas/delivery.schema';

/** Coerce `selected_meal.price` to an array for `$filter` (some documents store a single object). */
const SELECTED_MEAL_PRICE_AS_ARRAY = {
  $cond: {
    if: { $isArray: '$delivery_item.selected_meal.price' },
    then: '$delivery_item.selected_meal.price',
    else: {
      $cond: {
        if: {
          $eq: [{ $type: '$delivery_item.selected_meal.price' }, 'object'],
        },
        then: ['$delivery_item.selected_meal.price'],
        else: [],
      },
    },
  },
};

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel('Deliveries') private deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Orders') private orderModel: Model<OrderDocument>,
    @InjectModel('Subscriptions')
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel('dump_recipes')
    private dumpRecipesModel: Model<DumpRecipesDocument>,
    @InjectModel('delivery_dumps')
    private dumpDeliveriesModel: Model<DumpDeliveriesDocument>,
    @Inject(NotificationMasterService)
    private readonly notificationMasterService: NotificationMasterService,
    private readonly adminHistoryService: AdminHistoryService,
    @InjectModel('Rating')
    private readonly recipeRatingModel: Model<RecipeRatingDocument>,
    @InjectModel('awbs')
    private readonly awbModel: Model<AWBDocument>,
    @InjectModel('Addresses')
    private readonly addressModel: Model<AddressDocument>,
    @InjectModel('delivery_slots')
    private readonly ownDeliveryModel: Model<DeliverySlot>,
    @InjectModel('admin_history')
    private readonly adminHistoryModel: Model<AdminHistoryDocument>,
  ) { }

  // Cron job runs at 4 AM GST every day
  @Cron('0 4 * * *', {
    timeZone: 'Asia/Dubai', // GST timezone
  })
  async handleDeliveryDumpCron() {
    try {
      const BATCH_SIZE = 200;
      const targetDate = moment().subtract(90, 'days').utc().startOf('day');
      const dateRange = {
        $gte: targetDate.toDate(),
        $lte: targetDate.clone().endOf('day').toDate(),
      };

      console.log(
        `Processing deliveries for ${targetDate.format('YYYY-MM-DD')}`,
      );

      let totalDumped = 0;
      let totalDeleted = 0;

      while (true) {
        const deliveries = await this.deliveryModel
          .find({ delivery_date: dateRange })
          .limit(BATCH_SIZE)
          .lean();

        if (!deliveries?.length) {
          console.log('No more deliveries found, processing complete');
          break;
        }

        const ids = deliveries.map((d) => d._id);
        let insertSuccess = false;

        try {
          await this.dumpDeliveriesModel.insertMany(deliveries, {
            ordered: false,
          });
          totalDumped += deliveries.length;
          insertSuccess = true;
        } catch (err: any) {
          // MongoDB duplicate key error code: 11000 (E11000)
          // Also check for BulkWriteError which wraps duplicate errors
          const isDuplicateError =
            err.code === 11000 ||
            err.code === 11001 ||
            (err.name === 'BulkWriteError' &&
              err.writeErrors?.some((e: any) => e.code === 11000));

          if (isDuplicateError) {
            // Handle duplicates - insert only new ones
            const existing = await this.dumpDeliveriesModel
              .find({ _id: { $in: ids } })
              .select('_id')
              .lean();
            const existingSet = new Set(existing.map((e) => e._id.toString()));
            const newOnes = deliveries.filter(
              (d) => !existingSet.has(d._id.toString()),
            );
            if (newOnes.length) {
              await this.dumpDeliveriesModel.insertMany(newOnes);
              totalDumped += newOnes.length;
            }
            insertSuccess = true; // Safe to delete (either inserted or already existed)
          } else {
            console.error('Insert error:', err);
            throw err;
          }
        }

        if (insertSuccess) {
          // not deleting for time being then will uncomment later
          const deleted = await this.deliveryModel.deleteMany({
            _id: { $in: ids },
          });
          totalDeleted += deleted.deletedCount;
        }
      }

      if (totalDumped > 0 || totalDeleted > 0) {
        console.log(
          `Delivery dump completed: ${totalDumped} dumped, ${totalDeleted} deleted for ${targetDate.format('YYYY-MM-DD')}`,
        );
      } else {
        console.log(
          `No deliveries found for ${targetDate.format('YYYY-MM-DD')}`,
        );
      }
    } catch (error) {
      console.error('Delivery dump cron error:', error);
    }
  }

  async fetchDeliveryForCustomer(query: any) {
    const { week, limit, offset, customer_id, plan } = query;

    const autoCount = await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_type: 'subscription',
          customer_id: new mongoose.Types.ObjectId(customer_id),
          is_delivery_freezed: false,
          not_deliverable: false,
        },
      },
      { $unwind: '$delivery_item' },
      { $match: { 'delivery_item.selected_meal.is_auto_select': true } },
      { $project: { _id: 1 } },
    ]);

    const manualCount = await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_type: 'subscription',
          customer_id: new mongoose.Types.ObjectId(customer_id),
          is_delivery_freezed: false,
          not_deliverable: false,
        },
      },
      { $unwind: '$delivery_item' },
      { $match: { 'delivery_item.selected_meal.is_auto_select': false } },
      { $project: { _id: 1 } },
    ]);

    const calculateDates = (type: string, currentDate: Date) => {
      const day = moment(currentDate).day();
      if (type === 'Current week') {
        return {
          $gte: moment(currentDate)
            .subtract(day, 'days')
            .startOf('day')
            .toDate(),
          $lte: moment(currentDate)
            .add(6 - day, 'days')
            .endOf('day')
            .toDate(),
        };
      } else if (type === 'Past weeks') {
        return {
          $lt: moment(currentDate).subtract(day, 'days').endOf('day').toDate(),
        };
      } else if (type === 'Following Weeks') {
        return {
          $gt: moment(currentDate)
            .add(6 - day, 'days')
            .startOf('day')
            .toDate(),
        };
      }
      return {}; // No date range filter
    };

    const deliveryDateRange = week ? calculateDates(week, new Date()) : {}; // Apply date filter only if week is provided
    const deliveryType = plan === 'Meal Plan Orders' ? 'subscription' : 'NDD';

    const payload: any = {
      customer_id: new mongoose.Types.ObjectId(customer_id),
      delivery_type: deliveryType,
      not_deliverable: false,
    };

    if (Object.keys(deliveryDateRange).length) {
      payload.delivery_date = deliveryDateRange;
    }

    const deliveryData = await this.deliveryModel
      .find(payload)
      .sort({ delivery_date: week === 'Past weeks' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate({ path: 'address_id', select: 'address_type' })
      .populate({ path: 'order_id', select: 'order_number' })
      .lean();

    const formattedResponse = deliveryData.map((delivery: any) => {
      const mealArray = [];
      let outerRowSpan = 0;

      if (delivery.delivery_type === 'NDD') {
        if (!delivery.not_deliverable) {
          delivery.delivery_item.forEach((item) => {
            const existingMeal = mealArray.find(
              (m) => m.type === item.meal_category,
            );
            if (!existingMeal) {
              const newMeal = {
                type: item.meal_category,
                items: [
                  {
                    name: `${item.dish_name} x ${item.qty}`,
                    auto: false,
                    variant: item.protein_option?.protein_option,
                  },
                ],
              };
              mealArray.push(newMeal);
              outerRowSpan++;
            } else {
              existingMeal.items.push({
                name: `${item.dish_name} x ${item.qty}`,
                auto: false,
                variant: item.protein_option?.protein_option,
              });
              outerRowSpan++;
            }
          });
        } else {
          mealArray.push({ type: 'NOT DELIVERABLE', items: [] });
        }
      } else if (delivery.delivery_type === 'subscription') {
        if (!delivery.not_deliverable) {
          delivery.delivery_item.forEach((item) => {
            const existingMeal = mealArray.find(
              (m) => m.type === item.meal_type,
            );
            if (!existingMeal) {
              const newMeal = {
                type: item.meal_type,
                items: [
                  {
                    name: item.selected_meal?.dish_name,
                    auto: item.selected_meal?.is_auto_select,
                    variant: item.selected_meal?.variants?.protein_option,
                  },
                ],
              };
              mealArray.push(newMeal);
              outerRowSpan++;
            } else {
              existingMeal.items.push({
                name: item.selected_meal?.dish_name,
                auto: item.selected_meal?.is_auto_select,
                variant: item.selected_meal?.variants?.protein_option,
              });
              outerRowSpan++;
            }
          });
        } else {
          mealArray.push({ type: 'NOT DELIVERABLE', items: [] });
        }
      }

      return {
        date: moment(delivery.delivery_date).format('Do MMM YY ddd'),
        orderNumber: delivery.order_id?.order_number,
        meals: mealArray.map((meal) => ({
          type: meal.type,
          dishes: meal.items.map((i) => i.name),
          variants: meal.items.map((i) => i.variant),
        })),
        deliverTo: `${delivery.address_id?.address_type || 'Unknown'} ${delivery.slot || ''}`,
      };
    });

    const count = await this.deliveryModel.countDocuments(payload);

    return {
      deliveryData: formattedResponse,
      count,
      autoCount: autoCount.length,
      manualCount: manualCount.length,
    };
  }

  async getDeliveryForSingleSubs(
    subscriptionId: string,
    limit: number,
    page: number,
  ) {
    try {
      const subscriptionObjectId = new mongoose.Types.ObjectId(subscriptionId);
      // Aggregation pipeline with pagination
      const deliveryData = await this.deliveryModel.aggregate([
        {
          // 1. Filter first (Equality)
          $match: {
            subscription_id: subscriptionObjectId,
            not_deliverable: false,
          },
        },
        {
          // 2. Sort immediately after match to use the Compound Index
          $sort: { delivery_date: 1 },
        },
        {
          // 3. Paginate BEFORE Lookups (Huge performance gain)
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit,
        },
        {
          // 4. Only join data for the few documents that passed the limit
          $lookup: {
            from: 'addresses',
            localField: 'address_id',
            foreignField: '_id',
            as: 'address',
          },
        },
        { $unwind: { path: '$address', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'orders',
            localField: 'order_id',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: { path: '$order', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'ratings',
            localField: '_id',
            foreignField: 'delivery_id',
            as: 'ratings',
          },
        },
        {
          $project: {
            delivery_date: 1,
            delivery_item: 1,
            slot: 1,
            is_delivery_freezed: 1,
            status: 1,
            'address.address_type': 1,
            'order.order_number': 1,
            ratings: 1,
            selected_meal: 1,
            selected_meal_type: 1,
          },
        },
      ]);

      // Format the data for the response
      const formattedData = deliveryData.map((delivery: any, index) => {
        const meals = delivery.delivery_item
          ?.map((item) => {
            const selectedMeal = item.selected_meal;
            if (selectedMeal) {
              return {
                recipe_id: selectedMeal?.recipe_id,
                unique_id: selectedMeal?.unique_id,
                dish_name: selectedMeal.dish_name,
                meal_type: item.meal_type?.replace(/_/g, ' '),
                is_auto_select: selectedMeal.is_auto_select,
                protein_option: selectedMeal?.variants?.protein_option || null,
                size: selectedMeal?.variants?.size || null,
                protein_category:
                  selectedMeal?.variants?.protein_category || null,
              };
            }
            return null;
          })
          .filter(Boolean);

        const ratingInfo = delivery.ratings?.[0] || {};
        return {
          sl_no: (page - 1) * limit + (index + 1), // Sequential number across pages
          date: delivery.delivery_date,
          order_number: delivery.order?.order_number || '--',
          meals: meals || [],
          deliver_to: `${delivery.address?.address_type || ''} ${delivery.slot || ''
            }`,
          is_delivery_freezed: delivery.is_delivery_freezed,
          delivery_status: delivery.status || 'Unknown',
          recipe_id: ratingInfo.recipe_id || 'N/A',
          allReview: delivery.ratings,
          selected_meal: delivery?.selected_meal?.join(', '),
        };
      });

      // Total count for pagination
      const totalCount = await this.deliveryModel.countDocuments({
        subscription_id: subscriptionObjectId,
        not_deliverable: false,
      });

      return {
        deliveries: formattedData,
        total: totalCount,
        limit,
        page,
      };
    } catch (error) {
      console.error('Error in getDeliveryForSingleSubs:', error);
      throw new Error('Failed to fetch delivery data.');
    }
  }

  async dishCostReport(dishReportDto: DishReportDto): Promise<any> {
    const orders = await this.dishCostReportData(dishReportDto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dish Report');

    worksheet.addRow('');
    worksheet.addRow([
      '',
      'Weekly Dish and Cost Report',
      '',
      '',
      '',
      '',
      'Date',
      new Date().toLocaleString(),
    ]);
    worksheet.addRow('');
    const dates = Array.from(
      new Set(orders.flatMap((order) => Object.keys(order.counts))),
    ).sort();
    worksheet.addRow(['', ...dates, 'Total', '', ...dates, 'Total']);

    // const headers = ['Dish Name', 'Meal Category', ...dates, 'Total'];
    // worksheet.addRow(headers);

    // Group orders by meal_category
    const groupedOrders = orders.reduce((acc, order) => {
      const category = order.meal_category || 'Uncategorized'; // Default to 'Uncategorized' if no category
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(order);
      return acc;
    }, {});

    // Add data rows dynamically
    Object.keys(groupedOrders).forEach((mealCategory) => {
      worksheet.addRow([mealCategory]);
      const categoryOrders = groupedOrders[mealCategory];

      // For each group (meal category), process the orders
      categoryOrders.forEach((order) => {
        const countValues = dates.map(
          (date) => order.counts[date as string]?.count || 0,
        );
        const priceValues = dates.map(
          (date) => order.counts[date as string]?.price || 0,
        );

        const rowValues = [
          order.dish_name, // Dish Name
          ...countValues, // Counts for each date
          countValues.reduce((sum, count) => sum + count, 0), // Total Count
          '', // Spacer column
          ...priceValues, // Prices for each date
          priceValues.reduce((sum, price) => sum + price, 0), // Total Price
        ];

        worksheet.addRow(rowValues);
      });

      worksheet.addRow('');
      //   const rowValues = [
      //     order.dish_name, // Dish Name
      //     // mealCategory, // Meal Category
      //     ...dates.map((date) => order.counts[date as string] || 0), // Cast date to string
      //     Object.values(order.counts).reduce(
      //       (sum: number, count: number) => sum + count,
      //       0,
      //     ), // Total count for the dish
      //   ];

      //   worksheet.addRow(rowValues);
      // });
      // worksheet.addRow('');
    });

    // Style headers (optional)
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Generate a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async breakdownCostReport(dishReportDto: DishReportDto): Promise<any> {
    const orders = await this.breakdownCostReportData(dishReportDto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Breakdown Cost Report');

    // Add title and date
    worksheet.addRow([
      '',
      'Weekly Breakdown Cost Order Report',
      '',
      '',
      '',
      '',
      'Date',
      new Date().toLocaleString(),
    ]);
    worksheet.addRow(''); // Empty row for spacing

    // Define headers
    const headers = [
      'Dish Name',
      'Meal Category',
      'Date',
      'Diet Type',
      'Variant',
      'Size',
      'Price',
      'Count',
      'Unit Price',
    ];

    // Add headers to worksheet
    worksheet.addRow(headers);

    // Add data rows dynamically
    orders.forEach((item) => {
      worksheet.addRow([
        item['Dish Name'],
        item['Meal Category'],
        item['Date'],
        item['Diet Type'],
        item['Variant'],
        item['Size'],
        item['Price'],
        item['Count'],
        item['Unit Price'],
      ]);
    });

    // Generate a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async dishCostReportData(dishReportDto) {
    return await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_date: {
            $gte: new Date(
              moment(dishReportDto.start_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
            $lte: new Date(
              moment(dishReportDto.end_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
          },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
        },
      },
      {
        $unwind: {
          path: '$delivery_item',
        },
      },
      {
        $project: {
          dish_name: '$delivery_item.selected_meal.dish_name',
          meal_category: '$delivery_item.selected_meal.meal_category',
          delivery_date: 1,
          variants: '$delivery_item.selected_meal.variants.protein_option',
          size: '$delivery_item.selected_meal.variants.size',
          day: {
            $dateToString: {
              format: '%d',
              date: '$delivery_date',
            },
          },
          month: {
            $dateToString: {
              format: '%m',
              date: '$delivery_date',
            },
          },
          year: {
            $dateToString: {
              format: '%Y',
              date: '$delivery_date',
            },
          },
          price: '$delivery_item.selected_meal.price',
          filtered_price: {
            $filter: {
              input: SELECTED_MEAL_PRICE_AS_ARRAY,
              as: 'item',
              cond: {
                $eq: [
                  '$$item.protein_type',
                  '$delivery_item.selected_meal.variants.protein_option',
                ],
              },
            },
          },
          meal_price: '$delivery_item.selected_meal.variants.components',
        },
      },
      // {
      //   $match:
      //     /**
      //      * query: The query in MQL.
      //      */
      //     {
      //       dish_name:
      //         "Balkan Mushroom Rice and Protein"
      //     }
      // }
      {
        $addFields: {
          month_name: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$month', '01'],
                  },
                  then: 'Jan',
                },
                {
                  case: {
                    $eq: ['$month', '02'],
                  },
                  then: 'Feb',
                },
                {
                  case: {
                    $eq: ['$month', '03'],
                  },
                  then: 'Mar',
                },
                {
                  case: {
                    $eq: ['$month', '04'],
                  },
                  then: 'Apr',
                },
                {
                  case: {
                    $eq: ['$month', '05'],
                  },
                  then: 'May',
                },
                {
                  case: {
                    $eq: ['$month', '06'],
                  },
                  then: 'Jun',
                },
                {
                  case: {
                    $eq: ['$month', '07'],
                  },
                  then: 'Jul',
                },
                {
                  case: {
                    $eq: ['$month', '08'],
                  },
                  then: 'Aug',
                },
                {
                  case: {
                    $eq: ['$month', '09'],
                  },
                  then: 'Sep',
                },
                {
                  case: {
                    $eq: ['$month', '10'],
                  },
                  then: 'Oct',
                },
                {
                  case: {
                    $eq: ['$month', '11'],
                  },
                  then: 'Nov',
                },
                {
                  case: {
                    $eq: ['$month', '12'],
                  },
                  then: 'Dec',
                },
              ],
              default: 'Invalid Month',
            },
          },
        },
      },
      {
        $project: {
          dish_name: 1,
          meal_category: 1,
          variants: 1,
          size: 1,
          delivery_date: {
            $concat: ['$day', '-', '$month_name', '-', '$year'],
          },
          month: 1,
          year: 1,
          day: 1,
          meal_price: 1,
          average_price: {
            $arrayElemAt: ['$filtered_price', 0],
          },
        },
      },
      {
        $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
          size_price: {
            $arrayElemAt: [
              {
                $objectToArray: '$average_price.size_prices',
              },
              {
                $indexOfArray: [
                  {
                    $map: {
                      input: {
                        $objectToArray: '$average_price.size_prices',
                      },
                      as: 'item',
                      in: '$$item.k',
                    },
                  },
                  '$size',
                ],
              },
            ],
          },
          size: 1,
          dish_name: 1,
          meal_category: 1,
          variants: 1,
          delivery_date: 1,
          month: 1,
          meal_price: 1,
          year: 1,
          day: 1,
        },
      },
      {
        $project:
        /**
         * specifications: The fields to
         *   include or exclude.
         */
        {
          dish_name: 1,
          meal_category: 1,
          size: 1,
          variants: 1,
          delivery_date: 1,
          month: 1,
          year: 1,
          day: 1,
          // average_price: '$size_price.v',
          average_price: {
            $cond: {
              if: {
                $eq: ['$meal_category', 'Meal'],
              },
              then: {
                $sum: {
                  $map: {
                    input: '$meal_price',
                    as: 'component',
                    in: '$$component.price',
                  },
                },
              },
              else: '$size_price.v',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            dish_name: '$dish_name',
            meal_category: '$meal_category',
            delivery_date: '$delivery_date',
          },
          price: {
            $sum: '$average_price',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $group:
        /**
         * _id: The id of the group.
         * fieldN: The first field name.
         */
        {
          _id: {
            dish_name: '$_id.dish_name',
            meal_category: '$_id.meal_category',
          },
          countsByDate: {
            $push: {
              date: '$_id.delivery_date',
              price: '$price',
              count: '$count',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          dish_name: '$_id.dish_name',
          meal_category: '$_id.meal_category',
          counts: {
            $arrayToObject: {
              $map: {
                input: '$countsByDate',
                as: 'item',
                in: {
                  k: '$$item.date',
                  // Value as an object with price and count
                  v: { price: '$$item.price', count: '$$item.count' },
                },
              },
            },
          },
        },
      },
      {
        $sort: { dish_name: 1 },
      },
    ]);
  }
  async breakdownCostReportData(dishReportDto) {
    return await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_date: {
            $gte: new Date(
              moment(dishReportDto.start_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
            $lte: new Date(
              moment(dishReportDto.end_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
          },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
        },
      },
      {
        $unwind: {
          path: '$delivery_item',
        },
      },
      {
        $project: {
          dish_name: '$delivery_item.selected_meal.dish_name',
          meal_category: '$delivery_item.selected_meal.meal_category',
          delivery_date: 1,
          variants: '$delivery_item.selected_meal.variants.protein_option',
          protein_category:
            '$delivery_item.selected_meal.variants.protein_category',
          size: '$delivery_item.selected_meal.variants.size',
          day: {
            $dateToString: {
              format: '%d',
              date: '$delivery_date',
            },
          },
          month: {
            $dateToString: {
              format: '%m',
              date: '$delivery_date',
            },
          },
          year: {
            $dateToString: {
              format: '%Y',
              date: '$delivery_date',
            },
          },
          price: '$delivery_item.selected_meal.price',
          filtered_price: {
            $filter: {
              input: SELECTED_MEAL_PRICE_AS_ARRAY,
              as: 'item',
              cond: {
                $eq: [
                  '$$item.protein_type',
                  '$delivery_item.selected_meal.variants.protein_option',
                ],
              },
            },
          },
          meal_price: '$delivery_item.selected_meal.variants.components',
        },
      },
      // {
      //   $match:
      //     /**
      //      * query: The query in MQL.
      //      */
      //     {
      //       dish_name: "Key Lime Yoghurt"
      //     }
      // }
      {
        $addFields: {
          month_name: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$month', '01'],
                  },
                  then: 'Jan',
                },
                {
                  case: {
                    $eq: ['$month', '02'],
                  },
                  then: 'Feb',
                },
                {
                  case: {
                    $eq: ['$month', '03'],
                  },
                  then: 'Mar',
                },
                {
                  case: {
                    $eq: ['$month', '04'],
                  },
                  then: 'Apr',
                },
                {
                  case: {
                    $eq: ['$month', '05'],
                  },
                  then: 'May',
                },
                {
                  case: {
                    $eq: ['$month', '06'],
                  },
                  then: 'Jun',
                },
                {
                  case: {
                    $eq: ['$month', '07'],
                  },
                  then: 'Jul',
                },
                {
                  case: {
                    $eq: ['$month', '08'],
                  },
                  then: 'Aug',
                },
                {
                  case: {
                    $eq: ['$month', '09'],
                  },
                  then: 'Sep',
                },
                {
                  case: {
                    $eq: ['$month', '10'],
                  },
                  then: 'Oct',
                },
                {
                  case: {
                    $eq: ['$month', '11'],
                  },
                  then: 'Nov',
                },
                {
                  case: {
                    $eq: ['$month', '12'],
                  },
                  then: 'Dec',
                },
              ],
              default: 'Invalid Month',
            },
          },
        },
      },
      {
        $project: {
          dish_name: 1,
          meal_category: 1,
          variants: 1,
          size: 1,
          protein_category: 1,
          delivery_date: {
            $concat: ['$day', '-', '$month_name', '-', '$year'],
          },
          month: 1,
          year: 1,
          day: 1,
          average_price: {
            $arrayElemAt: ['$filtered_price', 0],
          },
          meal_price: 1,
        },
      },
      {
        $project: {
          size_price: {
            $arrayElemAt: [
              {
                $objectToArray: '$average_price.size_prices',
              },
              {
                $indexOfArray: [
                  {
                    $map: {
                      input: {
                        $objectToArray: '$average_price.size_prices',
                      },
                      as: 'item',
                      in: '$$item.k',
                    },
                  },
                  '$size',
                ],
              },
            ],
          },
          size: 1,
          dish_name: 1,
          meal_category: 1,
          protein_category: 1,
          variants: 1,
          delivery_date: 1,
          month: 1,
          year: 1,
          day: 1,
          meal_price: 1,
        },
      },
      {
        $project: {
          dish_name: 1,
          meal_category: 1,
          size: 1,
          variants: 1,
          delivery_date: 1,
          month: 1,
          protein_category: 1,
          year: 1,
          day: 1,
          // average_price: "$size_price.v",
          average_price: {
            $cond: {
              if: {
                $eq: ['$meal_category', 'Meal'],
              },
              then: {
                $sum: {
                  $map: {
                    input: '$meal_price',
                    as: 'component',
                    in: '$$component.price',
                  },
                },
              },
              else: '$size_price.v',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            dish_name: '$dish_name',
            meal_category: '$meal_category',
            delivery_date: '$delivery_date',
            variants: '$variants',
            size: '$size',
            protein_category: '$protein_category',
          },
          price: {
            $sum: '$average_price',
          },
          count: {
            $sum: 1,
          },
          unit_price: {
            $first: '$average_price',
          },
        },
      },
      {
        $group: {
          _id: {
            dish_name: '$_id.dish_name',
            meal_category: '$_id.meal_category',
          },
          countsByDate: {
            $push: {
              date: '$_id.delivery_date',
              size: '$_id.size',
              variants: '$_id.variants',
              price: '$price',
              count: '$count',
              unit_price: '$unit_price',
              protein_category: '$_id.protein_category',
            },
          },
        },
      },
      {
        $unwind: '$countsByDate',
      },
      {
        $project: {
          _id: 0,
          'Dish Name': '$_id.dish_name',
          'Meal Category': '$_id.meal_category',
          Date: '$countsByDate.date',
          'Diet Type': '$countsByDate.protein_category',
          Variant: '$countsByDate.variants',
          Size: '$countsByDate.size',
          Price: '$countsByDate.price',
          Count: '$countsByDate.count',
          'Unit Price': '$countsByDate.unit_price',
        },
      },
      {
        $sort: {
          Date: 1,
          'Dish Name': 1,
          Size: 1,
        },
      },
    ]);
  }

  async addExtendDelivery(
    subscriptionId: string,
    subscriptionEndDate: string,
    deliverableDays: string,
    customerId: string,
    orderId: string,
    avoidIngredientsLength: number,
  ) {
    const deliveryEndDate = subscriptionEndDate;

    const tomorrow1 = new Date(subscriptionEndDate);
    const tomorrowDay = tomorrow1.getDay();
    tomorrow1.setDate(tomorrow1.getDate() + 1);

    if (deliverableDays === '6' && tomorrowDay === 6) {
      tomorrow1.setDate(tomorrow1.getDate() + 1);
    } else if (
      deliverableDays === '5' &&
      (tomorrowDay === 5 || tomorrowDay === 6)
    ) {
      tomorrow1.setDate(tomorrow1.getDate() + (tomorrowDay === 5 ? 2 : 1));
    }

    await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
      end_date: moment(new Date(tomorrow1))
        .startOf('day')
        .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
      $push: { delivery_total: 0, actual_delivery_total: 0 },
    });

    const deliveryLastData = await this.deliveryModel.findOne({
      subscription_id: new mongoose.Types.ObjectId(subscriptionId),
      delivery_date: new Date(deliveryEndDate),
    });

    const parseData = { ...deliveryLastData.toObject() }; // Convert to plain object
    delete parseData._id;
    delete parseData.customer_internal_code;
    delete parseData.awb;
    delete parseData.is_barcode_finalized;

    if (deliverableDays === '6') {
      if (tomorrowDay !== 6) {
        const finalDeliveryData = {
          ...parseData,
          delivery_date: new Date(tomorrow1),
          is_delivery_freezed: false,
          not_deliverable: false,
          delivery_item: [],
          status: 'Pending',
          is_processed: false,
          menu_live: false,
          extra_delivery: true,
          plan: 'normal',
        };
        await this.deliveryModel.create(finalDeliveryData);
      } else {
        const firstDeliveryDate = new Date(deliveryEndDate);
        firstDeliveryDate.setDate(firstDeliveryDate.getDate() + 1);

        const finalDeliveryData = [
          {
            ...parseData,
            delivery_date: new Date(tomorrow1),
            is_delivery_freezed: false,
            not_deliverable: false,
            delivery_item: [],
            status: 'Pending',
            is_processed: false,
            extra_delivery: true,
            plan: 'normal',
            menu_live: false,
          },
        ];
        await this.deliveryModel.insertMany(finalDeliveryData);
      }

      // Process dump recipes and send notifications
      await this.processDumpRecipesAndNotify(
        tomorrow1,
        customerId,
        orderId,
        avoidIngredientsLength,
      );
    } else if (deliverableDays === '5') {
      if (tomorrowDay === 5) {
        const firstDeliveryDate = new Date(deliveryEndDate);
        firstDeliveryDate.setDate(firstDeliveryDate.getDate() + 1);

        const middleDeliveryDate = new Date(deliveryEndDate);
        middleDeliveryDate.setDate(middleDeliveryDate.getDate() + 2);

        const secondDeliveryDate = new Date(deliveryEndDate);
        secondDeliveryDate.setDate(secondDeliveryDate.getDate() + 3);

        const finalDeliveryData = [
          // {
          //   ...parseData,
          //   delivery_date: new Date(firstDeliveryDate),
          //   is_delivery_freezed: false,
          //   not_deliverable: true,
          //   delivery_item: [],
          //   status: 'Pending',
          //   is_processed: false,
          // },
          // {
          //   ...parseData,
          //   delivery_date: new Date(middleDeliveryDate),
          //   is_delivery_freezed: false,
          //   not_deliverable: true,
          //   delivery_item: [],
          //   status: 'Pending',
          //   is_processed: false,
          // },
          {
            ...parseData,
            delivery_date: new Date(secondDeliveryDate),
            is_delivery_freezed: false,
            not_deliverable: false,
            delivery_item: [],
            status: 'Pending',
            is_processed: false,
            extra_delivery: true,
            plan: 'normal',
            menu_live: false,
          },
        ];
        await this.deliveryModel.insertMany(finalDeliveryData);

        // Process dump recipes and send notifications
        await this.processDumpRecipesAndNotify(
          secondDeliveryDate,
          customerId,
          orderId,
          avoidIngredientsLength,
        );
      } else {
        const finalDeliveryData = {
          ...parseData,
          delivery_date: new Date(tomorrow1),
          is_delivery_freezed: false,
          not_deliverable: false,
          delivery_item: [],
          status: 'Pending',
          is_processed: false,
          extra_delivery: true,
          plan: 'normal',
          menu_live: false,
        };
        await this.deliveryModel.create(finalDeliveryData);

        // Process dump recipes and send notifications
        await this.processDumpRecipesAndNotify(
          tomorrow1,
          customerId,
          orderId,
          avoidIngredientsLength,
        );
      }
    }
    return {
      dateHistory: tomorrow1,
    };
  }

  private async processDumpRecipesAndNotify(
    deliveryDate: Date,
    customerId: string,
    orderId: string,
    avoidIngredientsLength: number,
  ) {
    const dateRange = [
      new Date(
        moment(deliveryDate)
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
      ),
    ];

    const dumpRecipes = await this.dumpRecipesModel.find(
      { date: { $in: dateRange } },
      { date: 1 },
    );

    const finalDates = dumpRecipes.map((item) =>
      moment(item.date).format('MM/DD/YYYY'),
    );

    const customerDetails = [
      {
        customer: customerId,
        type: avoidIngredientsLength > 0 ? 'withWarning' : 'withoutWarning',
        order_id: orderId,
      },
    ];

    if (finalDates.length > 0) {
      await this.notificationMasterService.sendMessageLambda({
        type: 'only_selection',
        customer: customerDetails,
        week: finalDates,
      });
    }
  }

  async getDeliveryDatesForPartialCancellation(subscriptionId: string) {
    // Fetch delivery dates for the given subscription
    const deliveryDays = await this.deliveryModel
      .find(
        {
          not_deliverable: false,
          subscription_id: new mongoose.Types.ObjectId(subscriptionId),
        },
        { delivery_date: 1, is_delivery_freezed: 1, not_deliverable: 1 },
      )
      .sort('delivery_date')
      .lean();

    return {
      deliveryDays: deliveryDays,
    };
  }

  async getCitiesWithAreas(filter: FilterCitiesDto): Promise<any> {
    const { city, area } = filter;

    const query: any = {};
    if (city) {
      query.city_name = { $regex: city, $options: 'i' }; // Case-insensitive city filter
    }
    if (area) {
      query['areas.area'] = { $regex: area, $options: 'i' }; // Case-insensitive area filter
    }

    const citiesData = await this.ownDeliveryModel.find(query).lean();

    return citiesData.map((cityData) => ({
      city: cityData.city_name,
      areas: cityData.areas.map((area) => area.area),
    }));
  }
  async getAllDeliveriesDates(customerId: string): Promise<any> {
    const Data = await this.deliveryModel
      .find({
        not_deliverable: false,
        delivery_date: {
          $gte: moment(new Date()).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        },
        customer_id: new mongoose.Types.ObjectId(customerId),
      })
      .select('delivery_date is_delivery_freezed')
      .sort({ delivery_date: 1 })
      .lean();

    return Data || [];
  }

  async freezeDelivery(payload: FreezeDeliveryDto): Promise<any> {
    const { customer_id, freeze_dates } = payload;
    const historyDates = [];
    let results = {};
    freeze_dates.sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });

    // eslint-disable-next-line prefer-const
    for (let [index, freezeDate] of freeze_dates.entries()) {
      const deliveryFreezeDate = await this.getBeetweenDay(freezeDate);

      const checkAlreadySkipped = await this.deliveryModel.findOneAndUpdate(
        {
          customer_id: new mongoose.Types.ObjectId(customer_id),
          delivery_date: deliveryFreezeDate,
          not_deliverable: false,
          is_delivery_freezed: false,
        },
        { $set: { is_delivery_freezed: true } },
        { select: 'subscription_id customer_id delivery_date' },
      );

      const subscriptionId = checkAlreadySkipped?.subscription_id?.toString();

      if (!checkAlreadySkipped) {
        results = {
          message: `Delivery already skipped or invalid for date: ${freezeDate}`,
          status: false,
        };
        continue;
      }
      historyDates?.push(freezeDate);
      const newDate = await this.freezeDeliveryRecursiveHelper(
        new mongoose.Types.ObjectId(subscriptionId),
        new mongoose.Types.ObjectId(customer_id),
        ++index,
      );
      results = {
        message: `Delivery skipped for date: ${freezeDate}`,
        data: newDate,
        status: true,
        historyDates: historyDates,
      };
    }

    return results;
  }

  private sortRestartDatesDesc(restart_dates: string[]): string[] {
    return [...restart_dates].sort((a: string, b: string): number => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }

  private async findDeliveryForRestart(
    customer_id: string,
    restartDate: string,
    options: { unfreeze?: boolean; requireFrozen?: boolean } = {},
  ): Promise<any> {
    const { unfreeze = false, requireFrozen = true } = options;
    const deliveryUnfreezeDate = await this.getBeetweenDay(restartDate);
    const query: Record<string, unknown> = {
      customer_id: new mongoose.Types.ObjectId(customer_id),
      delivery_date: deliveryUnfreezeDate,
      not_deliverable: false,
    };

    if (requireFrozen) {
      query.is_delivery_freezed = true;
    }

    if (unfreeze) {
      return this.deliveryModel.findOneAndUpdate(
        query,
        { $set: { is_delivery_freezed: false } },
        { select: 'subscription_id customer_id delivery_date' },
      );
    }

    return this.deliveryModel
      .findOne(query)
      .select('subscription_id customer_id delivery_date');
  }

  private async runAutoSelectionForDelivery(delivery: any): Promise<{
    dumpFound: boolean;
    lambdaTriggered: boolean;
  }> {
    return this.autoSelectionForDelivery(
      new Date(delivery?.delivery_date),
      undefined,
      delivery,
    );
  }

  async autoSelectionForRestartDates(
    payload: AutoSelectionDeliveryDto,
  ): Promise<any> {
    const { customer_id, restart_dates } = payload;
    let results: { message: string; status: boolean; error?: string } = {
      message: '',
      status: true,
    };
    const historyDates = [];
    const dateResults = [];

    for (const restartDate of this.sortRestartDatesDesc(restart_dates)) {
      try {
        const delivery = await this.findDeliveryForRestart(
          customer_id,
          restartDate,
          { requireFrozen: false },
        );

        if (!delivery) {
          const message = `No deliverable delivery found for date: ${restartDate}`;
          results = { message, status: false };
          dateResults.push({
            restartDate,
            deliveryFound: false,
            dumpFound: false,
            lambdaTriggered: false,
            status: false,
            message,
          });
          continue;
        }

        const selectionResult = await this.runAutoSelectionForDelivery(delivery);

        if (!selectionResult.dumpFound) {
          const message = `No recipe dump found for date: ${restartDate}. Create dump_recipes for this date first.`;
          results = { message, status: false };
          dateResults.push({
            restartDate,
            deliveryFound: true,
            dumpFound: false,
            lambdaTriggered: false,
            status: false,
            message,
          });
          continue;
        }

        historyDates?.push(restartDate);
        const message = `Auto-selection queued for date: ${restartDate}`;
        results = { message, status: true };
        dateResults.push({
          restartDate,
          deliveryFound: true,
          dumpFound: true,
          lambdaTriggered: selectionResult.lambdaTriggered,
          status: true,
          message,
        });
      } catch (error) {
        const message = `Error processing restart date: ${restartDate}`;
        results = {
          message,
          status: false,
          error: error.message,
        };
        dateResults.push({
          restartDate,
          deliveryFound: true,
          dumpFound: false,
          lambdaTriggered: false,
          status: false,
          message,
          error: error.message,
        });
        console.error(
          `Error processing restart date: ${restartDate}`,
          error,
          results,
        );
      }
    }

    return {
      message: 'Auto-selection completed successfully',
      data: 'Auto-selection completed successfully',
      status: true,
      historyDates: historyDates,
      dateResults,
    };
  }

  async unfreezeDelivery(payload: UnfreezeDeliveryDto): Promise<any> {
    const { customer_id, restart_dates } = payload;
    let results = {};
    const historyDates = [];
    restart_dates.sort((a: string, b: string): number => {
      // Convert date strings to Date objects
      const dateA = new Date(a);
      const dateB = new Date(b);
      // Compare the dates for sorting in descending order
      return dateB.getTime() - dateA.getTime();
    });
    for (const restartDate of restart_dates) {
      try {
        const deliveryUnfreezeDate = await this.getBeetweenDay(restartDate);

        // Query to check if the delivery is already unskipped
        const checkAlreadyUnSkipped = await this.deliveryModel.findOneAndUpdate(
          {
            customer_id: new mongoose.Types.ObjectId(customer_id),
            delivery_date: deliveryUnfreezeDate,
            not_deliverable: false,
            is_delivery_freezed: true,
          },
          { $set: { is_delivery_freezed: false } },
          { select: 'subscription_id customer_id delivery_date' },
        );
        const subscriptionId = checkAlreadyUnSkipped?.subscription_id;
        if (!checkAlreadyUnSkipped) {
          results = {
            message: `Delivery already unskipped or invalid for date: ${restartDate}`,
            status: false,
          };
          continue; // Skip to the next iteration if already unskipped
        }
        historyDates?.push(restartDate);
        await this.autoSelectionForDelivery(
          new Date(checkAlreadyUnSkipped?.delivery_date),
          undefined,
          checkAlreadyUnSkipped,
        );
        const endDate = await this.unfreezeDeliveryRecursiveHelper(
          new mongoose.Types.ObjectId(subscriptionId),
          new mongoose.Types.ObjectId(customer_id),
        );

        results = {
          message: `Delivery unskipped for date: ${restartDate}`,
          data: endDate,
          status: true,
        };
      } catch (error) {
        results = {
          message: `Error processing restart date: ${restartDate}`,
          status: false,
          error: error.message,
        };
        console.error(
          `Error processing restart date: ${restartDate}`,
          error,
          results,
        );
      }
    }

    return {
      message: 'Delivery Unskipped Successfully',
      data: 'Delivery Unskipped Successfully',
      status: true,
      historyDates: historyDates,
    };
  }
  // Helper function to get start and end time of a day
  async getBeetweenDay(date: any): Promise<any> {
    try {
      return {
        $gte: new Date(
          moment(new Date(date))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
        $lte: new Date(
          moment(new Date(date))
            .endOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
      };
    } catch (error) {
      console.log('catch Error--------------->', error);
    }
  }

  // Recursive helper to handle delivery freezing logic
  async freezeDeliveryRecursiveHelper(
    subscriptionId: any,
    customerId: any,
    index: number,
  ): Promise<any> {
    // Fetching the subscription data to update delivery
    console.log('subscriptionId==>', subscriptionId);
    const subscriptionData = await this.subscriptionModel
      .findById(subscriptionId, {
        _id: 1,
        end_date: 1,
        deliverable_days: 1,
        delivery_days: 1,
        order_id: 1,
        address_id: 1,
        customer_id: 1,
        selected_meal: 1,
        selected_meal_type: 1,
        slot: 1,
        avoid_ingredients: 1,
        delivery_start_date: 1,
        delivery_schedule: 1,
        plan: 1,
      })
      .lean();

    const isSmartSaver = subscriptionData?.plan === 'smart_saver';
    const delivery_schedule = isSmartSaver
      ? subscriptionData?.delivery_schedule || []
      : [];
    // Get the end date of the subscription
    let endDate = subscriptionData?.end_date;
    console.log('endDate', endDate);
    console.log('index', index);

    // Calculate the next delivery date based on delivery days
    let newDate = await this.latestEndDateForFreeze(
      endDate,
      subscriptionData?.delivery_days,
      customerId,
      subscriptionId,
      delivery_schedule,
    );
    console.log('newDate', newDate);
    // Find the delivery date query
    let checkDeliveryQuery = await this.getBeetweenDay(newDate);

    // Check if another subscription delivery exists on the new date
    let checkDelivery = await this.checkOtherSubscriptionDelivery(
      customerId,
      checkDeliveryQuery,
      subscriptionId,
    );
    if (checkDelivery) {
      const newDeliveryData = {
        address_id: new mongoose.Types.ObjectId(subscriptionData?.address_id),
        order_id: new mongoose.Types.ObjectId(subscriptionData?.order_id),
        subscription_id: new mongoose.Types.ObjectId(subscriptionData?._id),
        slot: subscriptionData?.slot,
      };
      // Handle case when delivery is already frozen
      while (checkDelivery?.is_delivery_freezed) {
        console.log('Inner is_delivery_freezed', checkDelivery?.delivery_date);
        await this.checkFreezeDeliveryOtherSubscription(
          checkDelivery,
          subscriptionData,
          newDeliveryData,
        );

        // Update the date for next check
        newDate = await this.latestEndDateForFreeze(
          checkDelivery?.delivery_date,
          subscriptionData?.delivery_days,
          customerId,
          subscriptionId,
          delivery_schedule,
        );
        console.log('Inner newDate', newDate);
        checkDeliveryQuery = await this.getBeetweenDay(newDate);
        checkDelivery = await this.checkOtherSubscriptionDelivery(
          customerId,
          checkDeliveryQuery,
          subscriptionId,
        );
      }
      if (checkDelivery) {
        // If delivery exists and meals are the same, update delivery details
        // const sameSelectedMeal = arraysMatchIrrespectiveOfIndex(checkDelivery?.selected_meal || [], subscriptionData?.selected_meal);

        // if (sameSelectedMeal) {
        //     console.log("Inner sameSelectedMeal")
        //     awaitthis.deliveryModelfindByIdAndUpdate(checkDelivery?._id, newDeliveryData);
        // } else {
        //     console.log("Inner Not sameSelectedMeal")

        // 🆕 Smart Saver: get correct meal type for this delivery day
        let selected_meal_type = subscriptionData?.selected_meal_type;
        if (isSmartSaver) {
          const deliveryDayNumber = new Date(
            checkDelivery?.delivery_date,
          ).getDay();
          const scheduleEntry = this.getScheduleEntry(
            delivery_schedule,
            deliveryDayNumber,
          );
          if (scheduleEntry) {
            selected_meal_type = this.getSmartSaverMealType(
              subscriptionData?.selected_meal_type,
              scheduleEntry.covers_meals_for,
            );
          }
        }
        //     // Update delivery with new meal selections
        const updateFirstDelivery = await this.deliveryModel.findByIdAndUpdate(
          checkDelivery?._id,
          {
            ...newDeliveryData,
            selected_meal: [
              ...new Set(selected_meal_type.map((item) => item.meal_type)),
            ],
            selected_meal_type,
            delivery_item: [],
          },
          { new: true },
        );
        await this.autoSelectionForDelivery(
          new Date(updateFirstDelivery?.delivery_date),
          subscriptionData,
          undefined,
        );
        // }
        // Update subscription start and end date
        await this.changeSubscriptionStartEndDate(subscriptionId);

        console.log('subscription_id', checkDelivery?.subscription_id);
        // Recursive call to handle next delivery
        return await this.freezeDeliveryRecursiveHelper(
          checkDelivery?.subscription_id?.toString(),
          customerId,
          index,
        );
      } else {
        return await this.createNewDeliveryIfNotAvailable(
          customerId,
          subscriptionId,
          newDate,
          subscriptionData,
        );
      }
    } else {
      // If no delivery is found, create a new one
      return await this.createNewDeliveryIfNotAvailable(
        customerId,
        subscriptionId,
        newDate,
        subscriptionData,
      );
    }
  }

  async unfreezeDeliveryRecursiveHelper(
    subscriptionId: any,
    customerId: any,
  ): Promise<any> {
    const subscriptionData = await this.subscriptionModel.findById(
      new mongoose.Types.ObjectId(subscriptionId),
      {
        _id: 1,
        end_date: 1,
        deliverable_days: 1,
        delivery_days: 1,
        order_id: 1,
        address_id: 1,
        selected_meal: 1,
        selected_meal_type: 1,
        slot: 1,
        avoid_ingredients: 1,
        customer_id: 1,
        delivery_schedule: 1,
        plan: 1,
      },
    );

    // const upcomingSubscription = await this.subscriptionModel
    //   .findOne(
    //     {
    //       customer_id: new mongoose.Types.ObjectId(customerId),
    //       delivery_start_date: { $gt: subscriptionData?.end_date }, // starts after current ends
    //       is_cancle: false,
    //     },
    //     {
    //       _id: 1,
    //       end_date: 1,
    //       deliverable_days: 1,
    //       delivery_schedule: 1,
    //       plan: 1,
    //     },
    //   )
    //   .sort({ delivery_start_date: 1, delivery_schedule: 1 }); // get nearest upcoming

    // console.log('upcomingSubscription', upcomingSubscription);
    const isSmartSaver = subscriptionData?.plan === 'smart_saver';
    const delivery_schedule = isSmartSaver
      ? subscriptionData?.delivery_schedule || []
      : [];
    console.log('delivery_schedule', delivery_schedule);
    const endDate = subscriptionData?.end_date;
    let newDate = await this.latestEndDateForFreeze(
      endDate,
      subscriptionData?.delivery_days,
      customerId,
      subscriptionId,
      delivery_schedule,
    );
    let checkDeliveryQuery = await this.getBeetweenDay(newDate);

    let checkDelivery = await this.checkOtherSubscriptionDeliveryForUnfrezze(
      customerId,
      checkDeliveryQuery,
      subscriptionId,
      endDate,
      delivery_schedule,
    );
    if (checkDelivery) {
      const newDeliveryData = {
        address_id: checkDelivery?.address_id,
        order_id: checkDelivery?.order_id,
        subscription_id: checkDelivery?.subscription_id,
        slot: checkDelivery?.slot,
      };
      while (checkDelivery?.is_delivery_freezed) {
        console.log('Inner is_delivery_freezed', checkDelivery?.delivery_date);
        await this.checkFreezeDeliveryOtherSubscription(
          checkDelivery,
          subscriptionData,
          newDeliveryData,
        );
        newDate = await this.latestEndDateForFreeze(
          checkDelivery?.delivery_date,
          subscriptionData?.delivery_days,
          customerId,
          subscriptionId,
          delivery_schedule,
        );
        console.log('Inner is_delivery_freezed newDate', newDate);
        checkDeliveryQuery = await this.getBeetweenDay(newDate);
        checkDelivery = await this.checkOtherSubscriptionDelivery(
          customerId,
          checkDeliveryQuery,
          subscriptionId,
        );
      }

      if (checkDelivery) {
        // const sameSelectedMeal = arraysMatchIrrespectiveOfIndex(checkDelivery?.selected_meal || [], subscriptionData?.selected_meal);
        let checkDeliveryQuery2 = await this.getBeetweenDay(endDate);
        let updateLastDelivery;
        // 🆕 Smart Saver: get correct meal type for end date delivery
        let selected_meal_type = subscriptionData?.selected_meal_type; // ← base from current sub
        if (isSmartSaver && delivery_schedule?.length > 0) {
          const endDayNumber = new Date(endDate).getDay();
          console.log('inner smart saver delivery update');
          const scheduleEntry = this.getScheduleEntry(
            delivery_schedule,
            endDayNumber,
          );
          if (scheduleEntry) {
            selected_meal_type = this.getSmartSaverMealType(
              subscriptionData?.selected_meal_type,
              scheduleEntry.covers_meals_for,
            );
            console.log(
              `[SmartSaver] Unfreeze end date day ${endDayNumber} covers:`,
              scheduleEntry.covers_meals_for,
            );
          }
        }
        // if (sameSelectedMeal) {
        //     console.log("sameSelectedMeal")
        //     updateLastDelivery = await Delivery.updateOne({
        //         subscription_id: new mongoose.Types.ObjectId(subscriptionId),
        //         customer_id: new mongoose.Types.ObjectId(CustomerId),
        //         delivery_date: checkDeliveryQuery2
        //     },
        //         {
        //             ...newDeliveryData,
        //             not_deliverable: false,
        //             is_delivery_freezed: false,
        //         })
        // }
        // else {
        // console.log(" not sameSelectedMeal")
        updateLastDelivery = await this.deliveryModel.updateOne(
          {
            subscription_id: new mongoose.Types.ObjectId(subscriptionData?._id),
            customer_id: new mongoose.Types.ObjectId(
              subscriptionData?.customer_id,
            ),
            delivery_date: checkDeliveryQuery2,
          },
          {
            ...newDeliveryData,
            not_deliverable: false,
            is_delivery_freezed: false,
            selected_meal: [
              ...new Set(selected_meal_type.map((item) => item.meal_type)),
            ],
            selected_meal_type,
            delivery_item: [],
          },
        );

        await this.autoSelectionForDelivery(
          new Date(endDate),
          undefined,
          checkDelivery,
        );
        // }
        console.log('updateLastDelivery====>', updateLastDelivery);
        const deliveryData =
          await this.changeSubscriptionStartEndDate(subscriptionId);
        console.log('deliveryData', deliveryData);
        await this.deliveryModel.updateMany(
          {
            subscription_id: new mongoose.Types.ObjectId(subscriptionData?._id),
            delivery_date: { $gte: new Date(deliveryData?.deliveryEndDate) },
            is_delivery_freezed: true,
          },
          {
            $set: newDeliveryData,
          },
        );

        //recursive call
        return await this.unfreezeDeliveryRecursiveHelper(
          checkDelivery?.subscription_id?.toString(),
          customerId,
        );
      } else {
        return await this.deleteDeliveryFromEnd(
          endDate,
          customerId,
          subscriptionId,
          subscriptionData,
        );
      }
    } else {
      return await this.deleteDeliveryFromEnd(
        endDate,
        customerId,
        subscriptionId,
        subscriptionData,
      );
    }
  }

  async latestEndDate(date: Date, deliveryDays: any): Promise<Date> {
    const dateData = new Date(date); // Create a copy of the date
    let daysToAdd = 1;

    while (daysToAdd > 0) {
      dateData.setDate(dateData.getDate() + 1);

      if (deliveryDays == '5' || deliveryDays == 5) {
        if (dateData.getDay() == 0 || dateData.getDay() == 6) {
          continue;
        }
      } else if (deliveryDays == '6' || deliveryDays == 6) {
        if (dateData.getDay() == 0) {
          continue;
        }
      }

      daysToAdd--;
    }

    return dateData;
  }

  async latestEndDateForFreeze(
    date: string | Date,
    delivery_days: number | string,
    customerId: any,
    subscriptionId: any,
    delivery_schedule: any,
  ): Promise<any> {
    let endDate = new Date(date);
    const isSmartSaver = delivery_schedule?.length > 0;

    let daysToAdd = 1;
    while (daysToAdd > 0) {
      endDate.setDate(endDate.getDate() + 1);
      const dayNumber = endDate.getDay();

      // 🆕 Smart Saver: only land on delivery days
      if (isSmartSaver) {
        console.log('inner smart ', dayNumber);
        const isDeliveryDay = delivery_schedule.some(
          (s) => s.day === dayNumber,
        );
        if (!isDeliveryDay) continue;
      }
      // existing 5-day logic
      else if (delivery_days == '5' || delivery_days == 5) {
        if (dayNumber === 0 || dayNumber === 6) {
          if (dayNumber === 6) {
            let checkDeliveryQueryInside = await this.getBeetweenDay(endDate);
            let checkDeliveryInside = await this.checkOtherSubscriptionDelivery(
              customerId,
              checkDeliveryQueryInside,
              subscriptionId,
            );
            if (!checkDeliveryInside) continue;
          } else {
            continue;
          }
        }
      }
      // existing 6-day logic
      else if (delivery_days == '6' || delivery_days == 6) {
        if (dayNumber === 0) continue;
      }

      daysToAdd--;
    }

    return endDate;
  }

  async checkOtherSubscriptionDeliveryForUnfrezze(
    CustomerId: string,
    checkDeliveryQuery: Date,
    subscription_id: string,
    endDate: Date,
    delivery_schedule: any,
  ): Promise<any> {
    if (delivery_schedule?.length > 0) {
      const endDayNumber = new Date(endDate).getDay();
      // 🆕 Smart Saver: only land on delivery days
      console.log('inner smart ', endDayNumber);
      const isDeliveryDay = delivery_schedule.some(
        (s) => s.day === endDayNumber,
      );
      if (!isDeliveryDay) {
        return false;
      }
    }
    const nextDelivery = await this.deliveryModel.findOne({
      customer_id: new mongoose.Types.ObjectId(CustomerId),
      delivery_date: checkDeliveryQuery,
      // is_delivery_freezed: false,
      not_deliverable: false,
      subscription_id: {
        $ne: new mongoose.Types.ObjectId(subscription_id),
      },
    });
    // return nextDelivery;
    if (nextDelivery) {
      const nextSubsData = await this.subscriptionModel.findById(
        new mongoose.Types.ObjectId(nextDelivery?.subscription_id),
        { original_delivery_start_date: 1, delivery_start_date: 1 },
      );
      console.log('original delivery start date ', nextSubsData);
      if (
        new Date(
          nextSubsData?.original_delivery_start_date ||
          nextSubsData?.delivery_start_date,
        ) <= new Date(endDate)
      ) {
        console.log('nextDelivery', nextDelivery);
        return nextDelivery;
      }
    }

    return false;
  }

  async checkFreezeDeliveryOtherSubscription(
    delivery: any,
    subscriptionData: any,
    newDeliveryData: any,
  ): Promise<Date> {
    const isSmartSaver = subscriptionData?.plan === 'smart_saver';

    let selected_meal_type = subscriptionData?.selected_meal_type;

    // 🆕 Smart Saver: filter meal type based on delivery day
    if (isSmartSaver && subscriptionData?.delivery_schedule?.length > 0) {
      const deliveryDayNumber = new Date(delivery?.delivery_date).getDay();
      const scheduleEntry = this.getScheduleEntry(
        subscriptionData.delivery_schedule,
        deliveryDayNumber,
      );

      if (scheduleEntry) {
        selected_meal_type = this.getSmartSaverMealType(
          subscriptionData?.selected_meal_type,
          scheduleEntry.covers_meals_for,
        );
        console.log(
          `[SmartSaver] Freeze update - day ${deliveryDayNumber} covers:`,
          scheduleEntry.covers_meals_for,
        );
      }
    }

    await this.deliveryModel.updateOne(
      { _id: delivery?._id },
      {
        ...newDeliveryData,
        selected_meal: [
          ...new Set(selected_meal_type.map((item) => item.meal_type)),
        ],
        selected_meal_type,
        delivery_item: [],
      },
    );

    return;
  }

  async calculateNextDeliveryDate(date, delivery_days, extraDays = 1) {
    const nextDate = new Date(date);

    while (extraDays > 0) {
      nextDate.setDate(nextDate.getDate() + 1);

      if (
        delivery_days === '5' &&
        (nextDate.getDay() === 0 || nextDate.getDay() === 6)
      ) {
        continue; // Skip weekends
      } else if (delivery_days === '6' && nextDate.getDay() === 0) {
        continue; // Skip Sunday
      }

      extraDays--;
    }

    return nextDate;
  }

  async checkOtherSubscriptionDelivery(
    customerId: any,
    query: any,
    subscriptionId: any,
  ): Promise<any> {
    return await this.deliveryModel.findOne(
      {
        customer_id: customerId,
        delivery_date: query,
        not_deliverable: false,
        subscription_id: {
          $ne: subscriptionId,
        },
      },
      {
        _id: 1,
        end_date: 1,
        order_id: 1,
        address_id: 1,
        selected_meal: 1,
        selected_meal_type: 1,
        slot: 1,
        avoid_ingredients: 1,
        subscription_id: 1,
        is_delivery_freezed: 1,
        delivery_type: 1,
        delivery_date: 1,
      },
    );
  }

  async changeSubscriptionStartEndDate(subscriptionId: string): Promise<any> {
    const deliveryStartDate = await this.deliveryModel
      .findOne(
        {
          subscription_id: new mongoose.Types.ObjectId(subscriptionId),
          not_deliverable: false,
          is_delivery_freezed: false,
        },
        { delivery_date: 1 },
      )
      .sort({ delivery_date: 1 });

    const deliveryEndDate = await this.deliveryModel
      .findOne(
        {
          subscription_id: new mongoose.Types.ObjectId(subscriptionId),
          not_deliverable: false,
          is_delivery_freezed: false,
        },
        { delivery_date: 1 },
      )
      .sort({ delivery_date: -1 });

    await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
      end_date: deliveryEndDate.delivery_date,
      delivery_start_date: deliveryStartDate.delivery_date,
    });

    return {
      deliveryStartDate: deliveryStartDate.delivery_date,
      deliveryEndDate: deliveryEndDate.delivery_date,
    };
  }

  async createNewDeliveryIfNotAvailable(
    customerId: any,
    subscriptionId: any,
    newDate: Date,
    subscriptionData: any,
  ): Promise<any> {
    console.log('Creating Delivery', new Date(newDate));

    const isSmartSaver = subscriptionData?.plan === 'smart_saver';
    let selected_meal_type = subscriptionData?.selected_meal_type;

    // 🆕 Smart Saver: filter meal type based on new delivery day
    if (isSmartSaver && subscriptionData?.delivery_schedule?.length > 0) {
      const deliveryDayNumber = new Date(newDate).getDay();
      const scheduleEntry = this.getScheduleEntry(
        subscriptionData.delivery_schedule,
        deliveryDayNumber,
      );

      if (scheduleEntry) {
        selected_meal_type = this.getSmartSaverMealType(
          subscriptionData?.selected_meal_type,
          scheduleEntry.covers_meals_for,
        );
        console.log(
          `[SmartSaver] New delivery - day ${deliveryDayNumber} covers:`,
          scheduleEntry.covers_meals_for,
        );
      }
    }

    const parseSubscriptionData = subscriptionData;
    delete parseSubscriptionData._id;

    const parseLastDelivery = {
      ...parseSubscriptionData,
      subscription_id: subscriptionData._id,
      delivery_type: 'subscription',
      delivery_date: new Date(newDate),
      selected_meal_type, // 🆕 overridden for smart saver
      is_delivery_freezed: false,
      not_deliverable: false,
      delivery_item: [],
      status: 'Pending',
      is_processed: false,
    };

    await this.deliveryModel.create(parseLastDelivery);
    const subsTempData =
      await this.changeSubscriptionStartEndDate(subscriptionId);
    await this.autoSelectionForDelivery(
      new Date(newDate),
      { ...parseSubscriptionData, selected_meal_type },
      undefined,
    );
    return subsTempData?.deliveryEndDate;
  }

  async createNewDelivery(
    customerId,
    subscriptionId,
    newDate,
    subscriptionData,
  ) {
    const newDelivery = {
      ...subscriptionData.toObject(),
      delivery_date: new Date(newDate),
      customer_id: new mongoose.Types.ObjectId(customerId),
      subscription_id: new mongoose.Types.ObjectId(subscriptionId),
      is_delivery_freezed: false,
      not_deliverable: false,
    };
    delete newDelivery._id;
    await this.deliveryModel.create(newDelivery);

    return newDelivery.delivery_date;
  }

  async getStartDate(
    dateStr: string,
    deliveryDays: string,
    deliveryType: string,
  ): Promise<string> {
    try {
      const date = moment(dateStr);
      const isDay = await this.isWeekday(date.toDate(), +deliveryDays);
      if (isDay) {
        const today = moment();
        const noonTime = moment().set({ hours: 12, minutes: 0, seconds: 0 });
        const isBeforeNoon = moment().isBefore(noonTime);

        if (isBeforeNoon) {
          today.add(deliveryType === 'NDD' ? 2 : 2, 'days');
        } else {
          today.add(deliveryType === 'NDD' ? 3 : 3, 'days');
        }

        if (
          date.format('MM-DD-YYYY HH:mm:ss') >=
          today.format('MM-DD-YYYY HH:mm:ss') ||
          date.isAfter(today)
        ) {
          return date.format();
        } else if (moment().isBefore(noonTime)) {
          return today.format();
        } else {
          return this.getStartDate(
            date.add(1, 'days').format(),
            deliveryDays,
            deliveryType,
          );
        }
      } else {
        return this.getStartDate(
          date.add(1, 'days').format(),
          deliveryDays,
          deliveryType,
        );
      }
    } catch (err) {
      console.log(err);
    }
  }

  async autoSelectionForDelivery(
    delivery_date: Date | string,
    subscriptionData: any,
    deliveryData: any,
  ): Promise<{ dumpFound: boolean; lambdaTriggered: boolean }> {
    let subsData = subscriptionData;
    if (deliveryData && !subscriptionData) {
      subsData = await this.subscriptionModel.findOne({
        _id: new mongoose.Types.ObjectId(deliveryData?.subscription_id),
      });
    }
    if (!delivery_date) {
      return { dumpFound: false, lambdaTriggered: false };
    }

    const selectionDate = await this.getBeetweenDay(delivery_date);
    const dumpObj = await this.dumpExist(selectionDate);

    if (!dumpObj) {
      return { dumpFound: false, lambdaTriggered: false };
    }

    const customerType =
      subsData?.avoid_ingredients?.length === 0
        ? 'withoutWarning'
        : 'withWarning';
    const customerDetails = [
      {
        customer: subsData?.customer_id,
        type: customerType,
        order_id: subsData?.order_id,
      },
    ];
    await this.notificationMasterService.sendMessageLambda({
      type: 'only_selection',
      customer: customerDetails,
      week: [moment(delivery_date).format('MM/DD/YYYY')],
    });

    return { dumpFound: true, lambdaTriggered: true };
  }

  async dumpExist(date: any): Promise<any> {
    const RecipesDetails = await this.dumpRecipesModel.findOne({ date: date });
    return RecipesDetails;
  }

  async deleteDeliveryFromEnd(
    endDate: Date,
    CustomerId: any,
    subscription_id: any,
    subscriptionData: any,
  ): Promise<Date> {
    const isSmartSaver = subscriptionData?.plan === 'smart_saver';
    const delivery_schedule = isSmartSaver
      ? subscriptionData?.delivery_schedule || []
      : [];

    // 🆕 Smart Saver: find last valid delivery day from end to delete
    if (isSmartSaver && delivery_schedule?.length > 0) {
      const endDayNumber = new Date(endDate).getDay();
      const isValidDeliveryDay = delivery_schedule.some(
        (s) => s.day === endDayNumber,
      );

      // if endDate is not a delivery day, find the nearest delivery from end
      let deleteDate = endDate;
      if (!isValidDeliveryDay) {
        const lastValidDelivery = await this.deliveryModel
          .findOne(
            {
              customer_id: new mongoose.Types.ObjectId(CustomerId),
              subscription_id: new mongoose.Types.ObjectId(subscription_id),
              delivery_date: { $lte: new Date(endDate) },
              is_delivery_freezed: false,
              not_deliverable: false,
            },
            { delivery_date: 1 },
          )
          .sort({ delivery_date: -1 });

        if (lastValidDelivery) {
          deleteDate = lastValidDelivery.delivery_date;
          console.log(
            `[SmartSaver] Delete from last valid delivery day: ${deleteDate}`,
          );
        }
      }

      const checkDeliveryQuery1 = await this.getBeetweenDay(deleteDate);
      await this.deliveryModel.deleteOne({
        customer_id: new mongoose.Types.ObjectId(CustomerId),
        subscription_id: new mongoose.Types.ObjectId(subscription_id),
        delivery_date: checkDeliveryQuery1,
        is_delivery_freezed: false,
        not_deliverable: false,
      });
    } else {
      // existing normal logic
      const checkDeliveryQuery1 = await this.getBeetweenDay(endDate);
      await this.deliveryModel.deleteOne({
        customer_id: new mongoose.Types.ObjectId(CustomerId),
        subscription_id: new mongoose.Types.ObjectId(subscription_id),
        delivery_date: checkDeliveryQuery1,
        is_delivery_freezed: false,
        not_deliverable: false,
      });
    }

    const deliveryData =
      await this.changeSubscriptionStartEndDate(subscription_id);
    console.log('deliveryData', deliveryData);

    await this.deliveryModel.deleteMany({
      subscription_id: new mongoose.Types.ObjectId(subscription_id),
      delivery_date: { $gte: new Date(deliveryData?.deliveryEndDate) },
      is_delivery_freezed: true,
    });

    return deliveryData?.deliveryEndDate;
  }

  private async isWeekday(date: Date, deliveryDays: number): Promise<boolean> {
    const day = date.getDay();
    if (deliveryDays === 5) {
      return day !== 0 && day !== 6;
    } else {
      return day !== 0;
    }
  }

  async updateDeliveryAddress(data: ChangeDeliveryAddressDto) {
    const {
      type,
      start_from,
      date_range,
      subscription_id,
      address_id,
      slot,
      delivery_id,
      week_day,
      customer_id,
    } = data;
    let updateDeliveryData;
    const histories = {
      after: {
        address_id: address_id,
        slot: slot,
        date_range,
        start_from,
      },
      before: {},
    };
    const addressData = await this.addressModel.findById(
      new mongoose.Types.ObjectId(address_id),
    );
    const addressString =
      (addressData?.full_address || ' ') +
      ', ' +
      (addressData?.province || ' ') +
      ', ' +
      (addressData?.city || ' ') +
      ', ' +
      (addressData?.country || ' ');

    let afterTime = '';
    let beforeTime = '';
    switch (slot) {
      case 'Before 7:30AM':
      case '3AM - 7:30AM':
      case '3AM - 6AM':
        afterTime = '03:00';
        beforeTime = '06:00';
        break;

      case '6AM - 9AM':
        afterTime = '06:00';
        beforeTime = '09:00';
        break;

      case '9AM - 12PM':
        afterTime = '09:00';
        beforeTime = '12:00';
        break;

      case '9AM - 1PM':
        afterTime = '09:00';
        beforeTime = '13:00';
        break;

      case '8AM - 6PM':
        afterTime = '08:00';
        beforeTime = '18:00';
        break;

      case '9AM - 10PM':
        afterTime = '09:00';
        beforeTime = '22:00';
        break;

      case '9AM - 6PM':
        afterTime = '09:00';
        beforeTime = '18:00';
        break;

      case '2PM - 6PM':
        afterTime = '14:00';
        beforeTime = '18:00';
        break;

      case '2PM - 10PM':
        afterTime = '14:00';
        beforeTime = '22:00';
        break;

      case '6PM - 10PM':
        afterTime = '18:00';
        beforeTime = '22:00';
        break;

      case '12PM - 3PM':
        afterTime = '12:00';
        beforeTime = '15:00';
        break;

      case '3PM - 7PM':
        afterTime = '15:00';
        beforeTime = '19:00';
        break;

      case '7PM - 11PM':
        afterTime = '19:00';
        beforeTime = '23:00';
        break;

      default:
        // Optional: Handle undefined slots or unexpected values here
        break;
    }
    switch (type) {
      case 'all':
        const data0: any = await this.handleAllTypeUpdate(
          customer_id,
          subscription_id,
          address_id,
          slot,
          addressData,
          addressString,
          afterTime,
          beforeTime,
        );
        histories.before['slot'] = data0?.slot;
        histories.before['address_id'] = data0?.address_id?.toString();
        break;

      case 'perticuler_date':
        const deliveryDate = await this.deliveryModel.findOne(
          {
            _id: new mongoose.Types.ObjectId(delivery_id),
            status: 'Pending',
            delivery_type: 'subscription',
          },
          { delivery_date: 1, _id: 0 },
        );

        const datevary = minimum11AmCutoff();

        // if (deliveryDate?.delivery_date < new Date(datevary)) {
        if (moment(deliveryDate?.delivery_date).isBefore(datevary)) {
          throw new BadRequestException(
            `The cut-off time has passed; editing is no longer allowed.`,
          );
        }

        updateDeliveryData = await this.deliveryModel.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(delivery_id),
            status: 'Pending',
            delivery_type: 'subscription',
          },
          { address_id: new mongoose.Types.ObjectId(address_id), slot },
          { new: false, runValidators: true },
        );

        await this.awbModel.updateMany(
          {
            'refund_bag_details.customer_id': customer_id,
            transcorp_date: deliveryDate?.delivery_date,
          },
          {
            $set: {
              'refund_bag_details.address': addressString,
              'refund_bag_details.city': addressData?.city,
              'refund_bag_details.area': addressData?.province,
              'refund_bag_details.slot': slot,
              'refund_bag_details.after_time': afterTime,
              'refund_bag_details.before_time': beforeTime,
            },
          },
        );
        histories.before['slot'] = updateDeliveryData?.slot;
        histories.before['address_id'] =
          updateDeliveryData?.address_id?.toString();
        break;

      case 'week_day':
        const data1: any = await this.handleWeekDayUpdate(
          customer_id,
          start_from,
          week_day,
          address_id,
          slot,
        );
        histories.before['slot'] = data1?.historyData?.slot;
        histories.before['address_id'] =
          data1?.historyData?.address_id?.toString();
        break;

      case 'start_from':
        const data2: any = await this.handleStartFromUpdate(
          start_from,
          subscription_id,
          address_id,
          slot,
        );
        histories.before['slot'] = data2?.historyData?.slot || '';
        histories.before['address_id'] =
          data2?.historyData?.address_id?.toString() || '';
        break;

      case 'date_range':
        const data3: any = await this.handleDateRangeUpdate(
          date_range,
          subscription_id,
          address_id,
          slot,
        );
        histories.before['slot'] = data3?.historyData?.slot || '';
        histories.before['address_id'] =
          data3?.historyData?.address_id?.toString() || '';
        break;
    }

    return {
      message: 'Changes have been updated.',
      data: updateDeliveryData,
      histories,
    };
  }

  private async handleAllTypeUpdate(
    customerId: string,
    subscriptionId: string,
    addressId: string,
    slot: string,
    addressData,
    addressString,
    afterTime,
    beforeTime,
  ) {
    try {
      await this.subscriptionModel.findById(subscriptionId);

      const datevary = minimum11AmCutoff();

      // const futureDate = moment().add(2, 'days').format();
      // const futureDate = moment()
      //   .tz('Asia/Dubai')
      //   .isBefore(
      //     moment
      //       .tz(moment().format('L'), 'Asia/Dubai')
      //       .subtract(2, 'days')
      //       .set('hours', 12)
      //       .set('minutes', 0)
      //       .set('seconds', 0),
      //   );
      // const deliveryDate = await this.getStartDate(
      //   futureDate,
      //   subscriptionData.delivery_days,
      //   'subscription',
      // );
      const newDate = moment(datevary)
        .utc(true)
        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        .toDate();

      const weekAddress = [
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ].map((key) => ({ key, address_id: addressId, slot }));

      await this.subscriptionModel.updateMany(
        {
          customer_id: new mongoose.Types.ObjectId(customerId),
          end_date: {
            $gte: moment()
              .utc(true)
              .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toDate(),
          },
        },
        {
          address_id: new mongoose.Types.ObjectId(addressId),
          slot,
          week_address: weekAddress,
        },
      );
      const historyData = await this.deliveryModel.findOne(
        {
          customer_id: new mongoose.Types.ObjectId(customerId),
          status: 'Pending',
          delivery_date: { $gte: newDate },
        },
        { address_id: 1, slot: 1 },
      );
      await this.deliveryModel.updateMany(
        {
          customer_id: new mongoose.Types.ObjectId(customerId),
          status: 'Pending',
          delivery_date: { $gte: newDate },
        },
        { address_id: new mongoose.Types.ObjectId(addressId), slot },
      );
      await this.awbModel.updateMany(
        {
          'refund_bag_details.customer_id': customerId,
          transcorp_date: { $gte: newDate },
        },
        {
          $set: {
            'refund_bag_details.address': addressString,
            'refund_bag_details.city': addressData?.city,
            'refund_bag_details.area': addressData?.province,
            'refund_bag_details.slot': slot,
            'refund_bag_details.after_time': afterTime,
            'refund_bag_details.before_time': beforeTime,
          },
        },
      );
      return historyData;
    } catch (error) {
      console.log(error);
    }
  }

  private async handleWeekDayUpdate(
    customerId: string,
    startFromStr: string | undefined,
    weekDay: string | undefined,
    addressId: string,
    slot: string,
  ) {
    if (!startFromStr || !weekDay) {
      throw new BadRequestException('Start date and week day are required');
    }

    const newDateFormat = moment(startFromStr).format('YYYY-MM-DD');
    const time = moment().format('HH:mm:ss');
    const date = moment(`${newDateFormat}T${time}`);

    await this.validateDeliveryDate(date.format());
    const historyData = {};
    const deliveryData = await this.deliveryModel.find(
      {
        customer_id: new mongoose.Types.ObjectId(customerId),
        status: 'Pending',
        delivery_type: 'subscription',
        delivery_date: {
          $gte: moment()
            .utc(true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toDate(),
        },
      },
      { delivery_date: 1, address_id: 1, slot: 1 },
    );
    historyData['address_id'] = deliveryData?.[0]?.address_id;
    historyData['slot'] = deliveryData?.[0]?.slot;

    for (const element of deliveryData) {
      const day = moment(element.delivery_date).format('dddd').toLowerCase();
      if (day === weekDay.toLowerCase()) {
        await this.deliveryModel.updateOne(
          {
            customer_id: customerId,
            status: 'Pending',
            delivery_date: element.delivery_date,
            delivery_type: 'subscription',
          },
          { address_id: addressId, slot },
        );
      }
    }

    await this.subscriptionModel.updateMany(
      {
        customer_id: customerId,
        end_date: {
          $gte: moment()
            .utc(true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toDate(),
        },
        week_address: { $elemMatch: { key: weekDay.toLowerCase() } },
      },
      {
        'week_address.$.address_id': addressId,
        'week_address.$.slot': slot,
      },
    );
    return historyData;
  }

  private async handleStartFromUpdate(
    startFromStr: string | undefined,
    subscriptionId: string | undefined,
    addressId: string,
    slot: string,
  ) {
    if (!startFromStr || !subscriptionId) {
      throw new BadRequestException(
        'Start date and subscription ID are required',
      );
    }

    await this.validateDeliveryDate(startFromStr);
    const historyData = await this.deliveryModel.findOne(
      {
        subscription_id: new mongoose.Types.ObjectId(subscriptionId),
        status: 'Pending',
        delivery_date: { $gte: moment(startFromStr).toDate() },
      },
      { address_id: 1, slot: 1 },
    );
    await this.deliveryModel.updateMany(
      {
        subscription_id: new mongoose.Types.ObjectId(subscriptionId),
        status: 'Pending',
        delivery_date: { $gte: moment(startFromStr).toDate() },
      },
      { address_id: addressId, slot },
    );
    return historyData;
  }

  private async handleDateRangeUpdate(
    dateRangeStr: string[] | undefined,
    subscriptionId: string | undefined,
    addressId: string,
    slot: string,
  ) {
    if (!dateRangeStr || !subscriptionId) {
      throw new BadRequestException(
        'Date range and subscription ID are required',
      );
    }
    const historyData = await this.deliveryModel.findOne(
      {
        subscription_id: new mongoose.Types.ObjectId(subscriptionId),
        status: 'Pending',
        delivery_date: moment(dateRangeStr?.[0]).toDate(),
        delivery_type: 'subscription',
      },
      { address_id: 1, slot: 1 },
    );
    for (const dateStr of dateRangeStr) {
      await this.validateDeliveryDate(dateStr);

      await this.deliveryModel.updateOne(
        {
          subscription_id: new mongoose.Types.ObjectId(subscriptionId),
          status: 'Pending',
          delivery_date: moment(dateStr).toDate(),
          delivery_type: 'subscription',
        },
        { address_id: addressId, slot },
      );
    }
    return historyData;
  }

  private async validateDeliveryDate(dateStr: string) {
    const newDateFormat = moment(dateStr).format('YYYY-MM-DD');
    const time = moment().format('HH:mm:ss');
    const dateTime = moment(`${newDateFormat}T${time}`);

    const isValid = moment().isBefore(
      moment(dateTime)
        .subtract(2, 'days')
        .set({ hours: 12, minutes: 0, seconds: 0 }),
    );

    if (!isValid) {
      throw new BadRequestException('You cannot edit this delivery now!');
    }
  }

  async addSaturdayDelivery(dto: AddSaturdayDeliveryDto) {
    const dates = [...new Set(dto.delivery_dates)];

    const parsedDates = dates.map((d) => moment(d).utcOffset(0, true));
    const invalidIdx = parsedDates.findIndex((d) => !d.isValid());
    if (invalidIdx !== -1) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: [
            { key: `Invalid ISO date string at index ${invalidIdx}` },
          ],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const nonSaturdayIdx = parsedDates.findIndex((d) => d.day() !== 6);
    if (nonSaturdayIdx !== -1) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: [{ key: 'Only Saturday delivery can be added' }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const subscription: any = await this.subscriptionModel
      .findById(new mongoose.Types.ObjectId(dto.subscription_id), {
        _id: 1,
        customer_id: 1,
        order_id: 1,
        address_id: 1,
        slot: 1,
        selected_meal_type: 1,
        plan: 1,
        delivery_schedule: 1,
      })
      .lean();

    if (!subscription) {
      throw new BadRequestException('Invalid subscription_id');
    }

    if (subscription.customer_id?.toString() !== dto.customer_id) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: [{ key: 'customer_id does not match subscription' }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (subscription.order_id?.toString() !== dto.order_id) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: [{ key: 'order_id does not match subscription' }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const isSmartSaver =
      subscription?.plan === 'smart_saver' &&
      Array.isArray(subscription?.delivery_schedule) &&
      subscription.delivery_schedule.length > 0;

    let selected_meal_type = subscription?.selected_meal_type || [];
    if (isSmartSaver) {
      const scheduleEntry = this.getScheduleEntry(
        subscription.delivery_schedule,
        6,
      );
      if (!scheduleEntry) {
        throw new HttpException(
          {
            message: 'Validation failed',
            errors: [{ key: 'Saturday is not enabled in delivery schedule' }],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      selected_meal_type = this.getSmartSaverMealType(
        selected_meal_type,
        scheduleEntry.covers_meals_for,
      );
    }

    const subscriptionObjectId = new mongoose.Types.ObjectId(dto.subscription_id);
    const customerObjectId = new mongoose.Types.ObjectId(subscription.customer_id);
    const orderObjectId = new mongoose.Types.ObjectId(subscription.order_id);
    const addressObjectId = new mongoose.Types.ObjectId(subscription.address_id);

    const dateRanges = await Promise.all(
      parsedDates.map((d) => this.getBeetweenDay(d.toDate())),
    );

    const existing = await this.deliveryModel
      .find(
        {
          subscription_id: subscriptionObjectId,
          not_deliverable: false,
          $or: dateRanges.map((r) => ({ delivery_date: r })),
        },
        { delivery_date: 1 },
      )
      .lean();

    if (existing?.length) {
      throw new HttpException(
        {
          message: 'Validation failed',
          errors: [{ key: 'Delivery already exists for one or more Saturdays' }],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const docs = parsedDates.map((d) => ({
      customer_id: customerObjectId,
      order_id: orderObjectId,
      subscription_id: subscriptionObjectId,
      address_id: addressObjectId,
      delivery_type: 'subscription',
      delivery_date: d.clone().startOf('day').toDate(),
      slot: subscription.slot,
      selected_meal_type,
      selected_meal: [
        ...new Set((selected_meal_type || []).map((m) => m.meal_type)),
      ],
      status: 'Pending',
      not_deliverable: false,
      is_delivery_freezed: false,
      is_processed: false,
      menu_live: false,
      extra_delivery: true,
      plan: subscription.plan || 'normal',
      delivery_item: [],
    }));

    const created = await this.deliveryModel.insertMany(docs);
    return { created };
  }

  getSmartSaverMealType = (selected_meal_type, covers_meals_for) => {
    const DAY_NAMES = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const coveredDayNames = covers_meals_for.map((d) => DAY_NAMES[d]);

    return selected_meal_type.map((meal) => ({
      ...meal,
      covers_days: coveredDayNames,
      qty: meal.qty * covers_meals_for.length,
    }));
  };

  getScheduleEntry = (delivery_schedule, dayNumber) => {
    return delivery_schedule?.find((s) => s.day === dayNumber) || null;
  };
}
