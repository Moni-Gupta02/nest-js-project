import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as moment from 'moment';
import mongoose, { Model } from 'mongoose';
import { AdminHistoryDocument } from 'src/admin-history/Schema/adminHistory';
import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import { handleDubai11Time } from 'src/common/utils/helper';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { OrderDocument } from 'src/order/schemas/order.schema';
import { OrderHistoryDocument } from 'src/order/schemas/order_history.schema';
import { AWBDocument } from 'src/pickup-orders/schemas/awb.schema';
import { RewardDocument } from 'src/reward/Schema /reward.schema';
import { PartialSubscriptionCancelDto } from './dto/create-subscription.dto';
import {
  AutoSelectionForParticularDto,
  CalculatedMealPriceDto,
  ChangeCategoryDto,
  ChangeMealTypeSubscriptionDto,
  CompleteSubscriptionCancelDto,
  InitiateBagRefundDto,
} from './dto/subscription.dto';
import {
  EditAvoidIngredientsDto,
  UpdateSubscriptionFixPriceDto,
  UpdateSubscriptionPriceDto,
} from './dto/update-subscription.dto';
import { SubscriptionDocument } from './schemas/subscription.schema';
import { SubscriptionFixPriceDocument } from './schemas/subscriptionFixPrice';
import { SubscriptionPriceDocument } from './schemas/subscriptionPrice.schema';
import {
  DIET_PLAN_MANDATORY_MEALS,
  getMandatoryMealsForDietPlan,
  mergeSelectedMealsWithMandatory,
} from './constants/diet-plan-meals.config';
import { assertMandatoryMealsPresent } from './helpers/diet-plan-meals.helper';
@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel('subscriptions')
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel('subscription_fix_prices')
    private SubscriptionsFixPricesModel: Model<SubscriptionFixPriceDocument>,
    @InjectModel('subscription_prices')
    private SubscriptionsPricesModel: Model<SubscriptionPriceDocument>,
    @InjectModel('Delivery')
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Orders') private readonly orderModel: Model<OrderDocument>,
    @InjectModel('rewards') private readonly rewardModel: Model<RewardDocument>,
    @InjectModel('Customers')
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel('dump_recipes')
    private readonly DumpRecipesModel: Model<DumpRecipesDocument>,
    private readonly notificationMasterService: NotificationMasterService,
    @InjectModel('admin_history')
    private adminHistoryModel: Model<AdminHistoryDocument>,
    @InjectModel('awbs')
    private readonly awbModel: Model<AWBDocument>,
    @InjectModel('OrdersHistory')
    private readonly orderHistoryModel: Model<OrderHistoryDocument>,
  ) { }

  async findAllSubscriptionPrice() {
    const data = await this.SubscriptionsPricesModel.find().select(
      'number_of_meal meal_type meal_tag is_active price_type refundable_deposite is_mandatory box_deposite_monthly',
    );
    return data;
  }
  async findAllSubscriptionFixPrice() {
    const data = await this.SubscriptionsFixPricesModel.find();
    return data;
  }
  async getPriceDetails(id: string): Promise<SubscriptionPriceDocument> {
    const subscriptionPrice =
      await this.SubscriptionsPricesModel.findById(id).exec();
    if (!subscriptionPrice) {
      throw new NotFoundException(`SubscriptionPrice with id ${id} not found`);
    }
    return subscriptionPrice;
  }
  async getFixPriceDetails(id: string): Promise<SubscriptionFixPriceDocument> {
    const subscriptionFixPrice =
      await this.SubscriptionsFixPricesModel.findById(id).exec();
    if (!subscriptionFixPrice) {
      throw new NotFoundException(`SubscriptionPrice with id ${id} not found`);
    }
    return subscriptionFixPrice;
  }
  async updatePrice(
    id: string,
    updateSubscriptionPriceDto: UpdateSubscriptionPriceDto,
  ): Promise<SubscriptionPriceDocument> {
    const updatedSubscriptionPrice =
      await this.SubscriptionsPricesModel.findByIdAndUpdate(
        id,
        updateSubscriptionPriceDto,
        { new: true },
      );
    if (!updatedSubscriptionPrice) {
      throw new NotFoundException(`SubscriptionPrice with id ${id} not found`);
    }
    return updatedSubscriptionPrice;
  }
  async updateFixPrice(
    id: string,
    updateSubscriptionFixPriceDto: UpdateSubscriptionFixPriceDto,
  ): Promise<SubscriptionFixPriceDocument> {
    const updatedSubscriptionFixPrice =
      await this.SubscriptionsFixPricesModel.findByIdAndUpdate(
        id,
        updateSubscriptionFixPriceDto,
        { new: true },
      );
    if (!updatedSubscriptionFixPrice) {
      throw new NotFoundException(`SubscriptionPrice with id ${id} not found`);
    }
    return updatedSubscriptionFixPrice;
  }
  async removePrice(id: string): Promise<SubscriptionPriceDocument> {
    const subscriptionPrice =
      await this.SubscriptionsPricesModel.findByIdAndDelete(id);
    if (!subscriptionPrice) {
      throw new NotFoundException(`SubscriptionPrice with id ${id} not found`);
    }
    return subscriptionPrice;
  }
  async removeFixPrice(id: string): Promise<SubscriptionFixPriceDocument> {
    const subscriptionPrice =
      await this.SubscriptionsFixPricesModel.findByIdAndDelete(id);
    if (!subscriptionPrice) {
      throw new NotFoundException(`SubscriptionPrice with id ${id} not found`);
    }
    return subscriptionPrice;
  }

  async partialSubscriptionCancel(
    subscriptionID: string,
    orderID: string,
    startDate: string,
    partialCancelDto: PartialSubscriptionCancelDto,
  ) {
    try {
      const {
        cancelled_by_name,
        cancelled_by_email,
        reason,
        refund,
        details,
        editDetails,
      } = partialCancelDto;
      console.log('partial cancel dto', partialCancelDto);
      // Validate 48-hour cancellation window
      const check_48_hours = moment()
        .tz('Asia/Dubai')
        .isAfter(
          moment
            .tz(startDate, 'DD/MM/YYYY', 'Asia/Dubai')
            .subtract(2, 'days')
            .set('hours', 12)
            .set('minutes', 0)
            .set('seconds', 0),
        );

      if (check_48_hours) {
        throw new Error(
          'Cancellation is not allowed within 48 hours of the start date.',
        );
      }

      const orderId = new mongoose.Types.ObjectId(orderID);
      const subscriptionId = new mongoose.Types.ObjectId(subscriptionID);

      // Get existing order to access current cancellation details
      const existingOrder = await this.orderModel.findById(orderId).lean();

      // Get all delivery dates that are not frozen or marked as not deliverable
      const deliveryData = await this.deliveryModel
        .find(
          {
            subscription_id: subscriptionId,
          },
          {
            delivery_date: 1,
            not_deliverable: 1,
            is_delivery_freezed: 1,
          },
        )
        .sort('delivery_date')
        .lean();

      // Filter valid delivery dates
      const validDeliveryDates = deliveryData.filter(
        (item) => !item.is_delivery_freezed && !item.not_deliverable,
      );

      // Find index of start date in valid delivery dates
      const startDateIndex = validDeliveryDates.findIndex(
        (item) =>
          moment(item.delivery_date).format('DD MMM YYYY') ===
          moment(startDate).format('DD MMM YYYY'),
      );

      if (startDateIndex === -1) {
        throw new Error('Invalid start date for cancellation');
      }

      // Calculate remaining deliveries before the cancellation date
      const remainingDeliveries = validDeliveryDates.slice(0, startDateIndex);

      // Create new cancellation detail entry
      const newCancellationDetail = {
        cancellation_type:
          remainingDeliveries.length > 0 ? 'Partial' : 'Complete',
        cancellation_start_date: moment(startDate).format('DD MMM YYYY'),
        cancellation_end_date: moment(
          validDeliveryDates[validDeliveryDates.length - 1].delivery_date,
        ).format('DD MMM YYYY'),
        previous_end_date: moment(
          validDeliveryDates[validDeliveryDates.length - 1].delivery_date,
        ).format('DD MMM YYYY'),
        new_end_date:
          remainingDeliveries.length > 0
            ? moment(
              remainingDeliveries[remainingDeliveries.length - 1]
                .delivery_date,
            ).format('DD MMM YYYY')
            : 'Complete Cancelled',
        meal_plan_days_now: remainingDeliveries.length,
        meal_plan_days_before: validDeliveryDates.length,
        cancelled_at: new Date(),
        cancelled_by: {
          name: cancelled_by_name,
          email: cancelled_by_email,
        },
        reason,
        refund,
        details,
      };

      // Get existing cancellation details array or initialize if not exists
      const existingCancellationDetails =
        existingOrder?.cancellation_details || [];

      // Create updated cancellation details array with new entry at 0th position
      const updatedCancellationDetails = [
        newCancellationDetail,
        ...existingCancellationDetails,
      ];
      // Handle rewards if applicable
      if (
        existingOrder?.reward_id &&
        existingOrder.order_status !== 'Partially_Cancelled'
      ) {
        await this.handleRewardsCancellation(existingOrder);
      }

      // Update order and subscription based on remaining deliveries
      if (remainingDeliveries.length > 0) {
        const newEndDate =
          remainingDeliveries[remainingDeliveries.length - 1].delivery_date;

        await this.orderModel.findByIdAndUpdate(orderId, {
          cancelAt: new Date(),
          order_status: 'Partially_Cancelled',
          cancelled_by_name,
          cancelled_by_email,
          reason,
          refund,
          details,
          cancellation_details: updatedCancellationDetails,
        });

        await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
          end_date: newEndDate,
          delivery_total: partialCancelDto?.editDetails?.deliveries,
        });

        // Delete future deliveries
        await this.deliveryModel.deleteMany({
          subscription_id: subscriptionId,
          delivery_date: { $gt: newEndDate },
        });
      } else {
        // Handle complete cancellation
        await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
          is_cancle: true,
          cancelAt: new Date(),
          delivery_total: partialCancelDto?.editDetails?.deliveries || [],
        });

        await this.orderModel.findByIdAndUpdate(orderId, {
          cancelAt: new Date(),
          order_status: 'Cancelled',
          cancelled_by_name,
          cancelled_by_email,
          reason,
          refund,
          details,
          cancellation_details: updatedCancellationDetails,
        });

        await this.deliveryModel.deleteMany({
          subscription_id: subscriptionId,
        });
      }
      console.log('editDetails111', editDetails);
      if (editDetails?.type != 'no_change' || editDetails?.price != 0) {
        const payload1 = {
          customer_id:
            new mongoose.Types.ObjectId(existingOrder?.customer_id) || null,
          order_id: new mongoose.Types.ObjectId(orderID) || null,
          subscription_id: new mongoose.Types.ObjectId(subscriptionID) || null,
          amount: Math.abs(editDetails?.price) || 0,
          is_credit:
            editDetails?.type == 'receive'
              ? true
              : editDetails?.type == 'pay' && false,
          payment_status:
            editDetails?.type == 'receive'
              ? 'Success'
              : editDetails?.type == 'pay' && 'Refund',
          payment_type: 'Partial Cancel Meal Plan',
          details: newCancellationDetail,
        };
        await this.orderHistoryModel.create(payload1);
      }
      return { success: true };
    } catch (error) {
      console.error('Error in partialSubscriptionCancel:', error.message);
      throw new Error(error.message);
    }
  }

  private async handleRewardsCancellation(orderDetails: any) {
    const rewardData = await this.rewardModel
      .findOne(
        { _id: orderDetails.reward_id, is_credit: true },
        { points_earned: 1, earned_amount_wallet: 1 },
      )
      .lean();

    if (rewardData) {
      const customerData = await this.customerModel
        .findById(orderDetails.customer_id)
        .lean();

      const updatedRewardWallet = Math.max(
        (customerData?.reward_wallet || 0) - rewardData.points_earned,
        0,
      );
      const updatedRewardAmountWallet = Math.max(
        (customerData?.reward_amount_wallet || 0) -
        rewardData.earned_amount_wallet,
        0,
      );

      await this.customerModel.findByIdAndUpdate(orderDetails.customer_id, {
        reward_wallet: updatedRewardWallet,
        reward_amount_wallet: updatedRewardAmountWallet,
      });

      await this.rewardModel.create({
        customer_id: orderDetails.customer_id,
        loyalty_benefits: 'Cancel Order',
        is_credit: false,
        status: 'completed',
        order_id: orderDetails._id,
        redeem_points: rewardData.points_earned,
        redeem_amount_wallet: rewardData.earned_amount_wallet,
      });
    }
  }

  async autoSelectionForParticular(body: AutoSelectionForParticularDto) {
    const { customer_id, order_id, subscription_id } = body;

    // Fetch subscription data
    const subscriptionData = await this.subscriptionModel
      .findById(subscription_id, {
        avoid_ingredients: 1,
      })
      .lean();

    // Calculate first delivery date
    const todayDate = new Date();
    const firstDelivery = new Date(
      moment(
        todayDate.setDate(
          todayDate.getDate() + (todayDate.getHours() < 12 ? 2 : 3),
        ),
      )
        .startOf('day')
        .toISOString(),
    );

    // Fetch delivery data
    const deliveryData = await this.deliveryModel
      .find(
        {
          subscription_id: new mongoose.Types.ObjectId(subscription_id),
          not_deliverable: false,
        },
        { delivery_date: 1 },
      )
      .lean();

    const dateRange: Date[] = [];
    let firstDate: Date | null = null;

    deliveryData?.forEach((item) => {
      const deliveryDate = new Date(
        moment(item.delivery_date).startOf('day').toISOString(),
      );
      if (deliveryDate >= firstDelivery) {
        if (dateRange.length === 0) firstDate = deliveryDate;
        dateRange.push(deliveryDate);
      }
    });

    // Find dump recipes for the date range
    const findDumpRecipe = await this.DumpRecipesModel.find(
      { date: { $in: dateRange } },
      { date: 1 },
    ).lean();

    const finalDates = findDumpRecipe?.map((item) =>
      moment(item.date).format('MM/DD/YYYY'),
    );

    // Prepare customer details
    const customerDetails = [
      {
        customer: customer_id,
        type:
          subscriptionData?.avoid_ingredients?.length > 0
            ? 'withWarning'
            : 'withoutWarning',
        order_id,
      },
    ];

    // Send message via Lambda if applicable
    if (finalDates?.length > 0) {
      const payload = {
        type: 'modify_user',
        customer: customerDetails,
        week: finalDates,
      };
      await this.notificationMasterService.sendMessageLambda(payload);
    }
    // Update subscription with kcal change time
    const kcalChangeTime = firstDate
      ? `*Changed from ${moment(firstDate).format('DD MMM YY')}`
      : "*Calorie can't be changed!";
    await this.subscriptionModel.findByIdAndUpdate(subscription_id, {
      kcal_change_time: kcalChangeTime,
    });

    return {
      date: firstDate ? moment(firstDate).format('DD MMM YY') : '',
    };
  }

  async editAvoidIngredients(
    body: EditAvoidIngredientsDto,
  ): Promise<{ success: boolean; message: string }> {
    const { subscription_id, avoid_ingredients } = body;

    const updatedSubscription = await this.subscriptionModel.findByIdAndUpdate(
      subscription_id,
      { avoid_ingredients },
      { new: true },
    );

    if (!updatedSubscription) {
      throw new Error('Subscription not found or update failed.');
    }

    return;
  }
  async changeCategory(body: ChangeCategoryDto): Promise<any> {
    const {
      subscription_id,
      protein_category,
      kcal,
      kcal_range,
      endDate,
      order_id,
      editDetails,
      customer_id,
    } = body;

    const subscriptionId = new mongoose.Types.ObjectId(subscription_id);
    const subsTempData: any =
      await this.subscriptionModel.findById(subscriptionId);
    const historyDetails: any = {
      before: {
        kcal_range: subsTempData?.selected_meal_type?.[0]?.kcal_range,
        kcal: subsTempData?.selected_meal_type?.[0]?.kcal,
        diet_type:
          subsTempData?.selected_meal_type?.[0]?.protein_category || 'balance',
      },
      after: {
        kcal_range: kcal_range,
        kcal: kcal,
        diet_type: protein_category || 'balance',
      },
    };
    // Calculate the delivery date logic
    const todayDate = new Date();
    const dubaiTime = moment(todayDate).utcOffset(4 * 60); // 4 hours in minutes
    const deliveryDate =
      dubaiTime.hours() < 12
        ? moment(todayDate).add(2, 'days').startOf('day').toDate()
        : moment(todayDate).add(3, 'days').startOf('day').toDate();

    if (deliveryDate <= moment(endDate).startOf('day').toDate()) {
      const mandatoryMeals = getMandatoryMealsForDietPlan(protein_category);
      const mergedMealValues = mergeSelectedMealsWithMandatory(
        subsTempData?.selected_meal,
        protein_category,
      );
      const dietCategory = protein_category || 'balance';
      const selectedMealTypeForPlan = this.buildSelectedMealTypeRows(
        mergedMealValues,
        kcal_range,
        kcal,
        dietCategory,
      );

      if (mandatoryMeals.length > 0) {
        await this.subscriptionModel.updateOne(
          { _id: subscriptionId },
          {
            $set: {
              selected_meal: mergedMealValues,
              selected_meal_type: selectedMealTypeForPlan,
              delivery_total: body?.editDetails?.deliveries,
            },
          },
        );
        await this.deliveryModel.updateMany(
          {
            subscription_id: subscriptionId,
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
              selected_meal: mergedMealValues,
              selected_meal_type: selectedMealTypeForPlan,
            },
          },
        );
        historyDetails.before.meal_selection =
          subsTempData?.selected_meal?.join(', ') || '';
        historyDetails.after.meal_selection = mergedMealValues.join(', ');
        historyDetails.after.mandatory_meals = mandatoryMeals;
      } else {
        await this.subscriptionModel.updateOne(
          { _id: subscriptionId },
          [
            {
              $set: {
                selected_meal_type: {
                  $map: {
                    input: '$selected_meal_type',
                    as: 'meal',
                    in: {
                      $mergeObjects: [
                        '$$meal',
                        {
                          protein_category: protein_category,
                          kcal: kcal,
                          kcal_range: kcal_range,
                        },
                      ],
                    },
                  },
                },
                delivery_total: body?.editDetails?.deliveries,
              },
            },
          ],
        );
        await this.deliveryModel.updateMany(
          {
            subscription_id: subscriptionId,
            delivery_date: {
              $gte: new Date(
                moment(new Date(deliveryDate)).format(
                  'YYYY-MM-DDTHH:mm:ss.SSS[Z]',
                ),
              ),
            },
          },
          [
            {
              $set: {
                selected_meal_type: {
                  $map: {
                    input: '$selected_meal_type',
                    as: 'meal',
                    in: {
                      $mergeObjects: [
                        '$$meal',
                        {
                          protein_category: protein_category,
                          kcal: kcal,
                          kcal_range: kcal_range,
                        },
                      ],
                    },
                  },
                },
              },
            },
          ],
        );
      }
      historyDetails.after.effective_from =
        moment(deliveryDate).format('DD MMM YYYY');
      // Auto-selection logic
      const subscriptionData = await this.subscriptionModel.findById(
        subscriptionId,
        { avoid_ingredients: 1, customer_id: 1 },
      );

      const deliveryData = await this.deliveryModel.find(
        { subscription_id: subscriptionId, not_deliverable: false },
        { delivery_date: 1 },
      );

      const dateRange: Date[] = [];
      let firstDate: Date | null = null;
      deliveryData.forEach((item) => {
        const deliveryDate1 = item.delivery_date;
        if (deliveryDate1 >= deliveryDate) {
          if (dateRange.length === 0) {
            firstDate = deliveryDate1;
          }
          dateRange.push(deliveryDate1);
        }
      });
      const dumpRecipes = await this.DumpRecipesModel.find(
        { date: { $in: dateRange } },
        { date: 1 },
      );
      const finalDates = dumpRecipes.map((recipe) =>
        moment(recipe.date).format('MM/DD/YYYY'),
      );
      const customerDetails = [
        {
          customer: subscriptionData.customer_id.toString(),
          type:
            subscriptionData?.avoid_ingredients?.length > 0
              ? 'withWarning'
              : 'withoutWarning',
          order_id: order_id,
        },
      ];

      if (finalDates.length > 0) {
        await this.notificationMasterService.sendMessageLambda({
          type: 'modify_user',
          customer: customerDetails,
          week: finalDates,
        });
      }
      historyDetails.after.auto_selection_dates = finalDates
        ?.map((finalDate) => moment(finalDate).format('DD MMM YYYY'))
        ?.join(', ');
      const kcalChangeTime =
        firstDate != null
          ? `*Changed from ${moment(firstDate).format('DD MMM YY')}`
          : "*Calorie can't be changed!";

      await this.subscriptionModel.findByIdAndUpdate(subscriptionId, {
        kcal_change_time: kcalChangeTime,
      });

      if (order_id) {
        await this.orderModel.findByIdAndUpdate(
          new mongoose.Types.ObjectId(order_id),
          {
            delivery_start_date: moment.utc(todayDate).startOf('day').toDate(),
          },
        );
      }

      console.log('editDetails1111', editDetails);
      if (editDetails?.type != 'no_change' || editDetails?.price != 0) {
        const payload1 = {
          customer_id: new mongoose.Types.ObjectId(customer_id) || null,
          order_id: new mongoose.Types.ObjectId(order_id) || null,
          subscription_id: new mongoose.Types.ObjectId(subscription_id) || null,
          amount: Math.abs(editDetails?.price) || 0,
          is_credit:
            editDetails?.type == 'receive'
              ? true
              : editDetails?.type == 'pay' && false,
          payment_status:
            editDetails?.type == 'receive'
              ? 'Success'
              : editDetails?.type == 'pay' && 'Refund',
          payment_type: 'Change Size / Diet Type',
          details: historyDetails,
        };
        await this.orderHistoryModel.create(payload1);
      }
      return {
        date: firstDate ? moment(firstDate).format('DD MMM YY') : undefined,
        historyDetails: historyDetails,
        mandatory_meals: getMandatoryMealsForDietPlan(protein_category),
        selected_meal: mergeSelectedMealsWithMandatory(
          subsTempData?.selected_meal,
          protein_category,
        ),
      };
    } else {
      throw new BadRequestException('delivery date is not in the valid range');
    }
  }
  getDietPlanMandatoryMealsConfig(proteinCategory?: string) {
    const mandatory = getMandatoryMealsForDietPlan(proteinCategory);
    return {
      protein_category: proteinCategory?.trim().toLowerCase() ?? null,
      mandatory_meals: mandatory,
      allows_extra_meals: true,
      all_diet_plans: Object.fromEntries(
        Object.entries(DIET_PLAN_MANDATORY_MEALS).map(([plan, meals]) => [
          plan,
          [...meals],
        ]),
      ),
    };
  }

  private buildSelectedMealTypeRows(
    mealValues: string[],
    kcal_range: string,
    kcal: string,
    protein_category: string,
  ) {
    let selectedMealType = mealValues.map((meal) => ({
      meal_type: meal,
      kcal_range,
      kcal,
      protein_category,
      qty: 1,
    }));
    return this.addMealCategories(selectedMealType);
  }

  addMealCategories(meals) {
    return meals.map((meal) => {
      let category = '';

      // Determine category based on meal_type
      switch (meal.meal_type) {
        case 'lunch':
        case 'dinner':
          category = 'meal';
          break;
        case 'morning_snack':
        case 'evening_snack':
          category = 'snack';
          break;
        case 'breakfast':
          category = 'breakfast';
          break;
        default:
          category = 'unknown'; // Fallback for unexpected types
      }

      // Return the updated object
      return {
        ...meal,
        meal_category: category,
      };
    });
  }
  async changeMealTypeSubscription(
    dto: ChangeMealTypeSubscriptionDto,
  ): Promise<{
    success: boolean;
    autoSelectionDate?: string;
    historyChanges: any;
  }> {
    const {
      subscription_id,
      selectedMeal,
      kcalData,
      partialStartDate,
      editDetails,
      customer_id,
      order_id,
    } = dto;

    // Parse selected meals
    let mealValues = selectedMeal.map((item) => item.value);

    // Fetch subscription data
    const subscriptionData: any = await this.subscriptionModel
      .findById(subscription_id)
      .lean();
    const historyChanges: any = {
      before: {
        meal_selection: subscriptionData?.selected_meal?.join(', ') || '',
      },
      after: {
        meal_selection: mealValues?.join(', ') || '',
        partial_start_date: moment(partialStartDate).format('DD MMM YYYY'),
      },
    };
    if (!subscriptionData) {
      throw new Error('Subscription not found.');
    }

    const kcal_range = subscriptionData?.selected_meal_type[0]?.kcal_range;
    const protein_category =
      subscriptionData?.selected_meal_type[0]?.protein_category;

    assertMandatoryMealsPresent(mealValues, protein_category);
    mealValues = mergeSelectedMealsWithMandatory(mealValues, protein_category);

    const selectedMealType = this.buildSelectedMealTypeRows(
      mealValues,
      kcal_range,
      kcalData,
      protein_category,
    );
    // Update subscription
    await this.subscriptionModel.updateOne(
      { _id: new mongoose.Types.ObjectId(subscription_id) },
      {
        $set: {
          selected_meal: mealValues,
          selected_meal_type: selectedMealType,
          delivery_total: dto?.editDetails?.deliveries,
        },
      },
    );

    // Update deliveries from the partial start date
    const deliveryUpdate = await this.deliveryModel.updateMany(
      {
        subscription_id: new mongoose.Types.ObjectId(subscription_id),
        delivery_date: {
          $gte: new Date(
            moment(new Date(partialStartDate))
              .utcOffset(240)
              .startOf('day')
              .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          ),
        },
      },
      {
        $set: {
          selected_meal: mealValues,
          selected_meal_type: selectedMealType,
        },
      },
    );

    // Auto-selection logic
    const today = new Date();
    const firstDeliveryDate = new Date(
      today.getHours() < 12
        ? moment(today.setDate(today.getDate() + 2))
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
        : moment(today.setDate(today.getDate() + 3))
          .startOf('day')
          .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
    );

    const deliveryData = await this.deliveryModel
      .find(
        {
          subscription_id: new mongoose.Types.ObjectId(subscription_id),
          delivery_date: { $gte: firstDeliveryDate },
          not_deliverable: false,
        },
        { delivery_date: 1 },
      )
      .lean();
    const dateRange = deliveryData
      .map((d) => d.delivery_date)
      .filter((date) => date >= firstDeliveryDate);
    const dumpRecipes = await this.DumpRecipesModel.find(
      { date: { $in: dateRange } },
      { date: 1 },
    ).lean();
    const finalDates = dumpRecipes.map(
      (d) => (console.log({ d }), moment(d.date).format('MM/DD/YYYY')),
    );

    const autoSelectionType =
      subscriptionData.avoid_ingredients?.length > 0
        ? 'withWarning'
        : 'withoutWarning';
    if (finalDates.length > 0) {
      await this.notificationMasterService.sendMessageLambda({
        type: 'modify_user',
        customer: [
          {
            customer: subscriptionData.customer_id.toString(),
            type: autoSelectionType,
            order_id: subscriptionData.order_id.toString(),
          },
        ],
        week: finalDates,
      });
    }
    historyChanges.after.auto_selection_dates = finalDates
      ?.map((finalDate) => moment(finalDate).format('DD MMM YYYY'))
      ?.join(', ');
    const autoSelectionDate =
      dateRange.length > 0 ? moment(dateRange[0]).format('DD MMM YY') : '';

    if (autoSelectionDate) {
      await this.subscriptionModel.findByIdAndUpdate(subscription_id, {
        $set: {
          kcal_change_time: `*Changed from ${autoSelectionDate}`,
        },
      });
    } else {
      await this.subscriptionModel.findByIdAndUpdate(subscription_id, {
        $set: {
          kcal_change_time: "*Calorie can't be changed!",
        },
      });
    }
    console.log('editDetails1111', editDetails);

    if (editDetails?.type != 'no_change' || editDetails?.price != 0) {
      const payload1 = {
        customer_id: new mongoose.Types.ObjectId(customer_id) || null,
        order_id: new mongoose.Types.ObjectId(order_id) || null,
        subscription_id: new mongoose.Types.ObjectId(subscription_id) || null,
        amount: Math.abs(editDetails?.price) || 0,
        is_credit:
          editDetails?.type == 'receive'
            ? true
            : editDetails?.type == 'pay' && false,
        payment_status:
          editDetails?.type == 'receive'
            ? 'Success'
            : editDetails?.type == 'pay' && 'Refund',
        payment_type: 'Change No of Meals',
        details: {
          before: {
            meal_selection: subscriptionData?.selected_meal?.join(', ') || '',
          },
          after: {
            meal_selection: mealValues?.join(', ') || '',
            partial_start_date: moment(partialStartDate).format('DD MMM YYYY'),
          },
        },
      };
      await this.orderHistoryModel.create(payload1);
    }

    return {
      success: true,
      autoSelectionDate,
      historyChanges,
    };
  }

  async completeSubscriptionCancel(body: CompleteSubscriptionCancelDto) {
    try {
      const {
        subscriptionId,
        orderId,
        cancelled_by_name,
        cancelled_by_email,
        reason,
        refund,
        details,
        editDetails,
      } = body;

      const subscriptionObjectId = new mongoose.Types.ObjectId(subscriptionId);
      const orderObjectId = new mongoose.Types.ObjectId(orderId);

      // Fetch and filter delivery data for the subscription
      const deliveryData = await this.deliveryModel
        .find(
          { subscription_id: subscriptionObjectId },
          { delivery_date: 1, not_deliverable: 1, is_delivery_freezed: 1 },
        )
        .sort('delivery_date')
        .lean();

      const validDeliveries = deliveryData.filter(
        (item) => !item.is_delivery_freezed && !item.not_deliverable,
      );

      let cancellation_details: any = {};
      if (validDeliveries.length > 0) {
        const firstDeliveryDate = validDeliveries[0].delivery_date;
        const lastDeliveryDate =
          validDeliveries[validDeliveries.length - 1].delivery_date;

        cancellation_details = {
          cancellation_type: 'Complete',
          cancellation_start_date:
            moment(firstDeliveryDate).format('DD MMM YYYY'),
          cancellation_end_date: moment(lastDeliveryDate).format('DD MMM YYYY'),
          previous_end_date: moment(lastDeliveryDate).format('DD MMM YYYY'),
          new_end_date: 'Complete Cancelled',
          meal_plan_days_now: 0,
          meal_plan_days_before: validDeliveries.length,
          cancelled_at: new Date(),
          cancelled_by: {
            name: cancelled_by_name,
            email: cancelled_by_email,
          },
          reason,
          refund,
          details,
        };
      } else {
        cancellation_details = {
          cancellation_type: 'Complete',
          cancellation_start_date: null,
          cancellation_end_date: 'Complete Cancelled',
          previous_end_date: 'Complete Cancelled',
          new_end_date: 'Complete Cancelled',
          meal_plan_days_now: 0,
          meal_plan_days_before: 0,
          cancelled_at: new Date(),
          cancelled_by: {
            name: cancelled_by_name,
            email: cancelled_by_email,
          },
          reason,
          refund,
          details,
        };
      }

      // Update subscription to mark it as canceled
      await this.subscriptionModel.findByIdAndUpdate(subscriptionObjectId, {
        is_cancle: true,
        cancelAt: new Date(),
      });

      // Fetch order details
      const orderDetails: any = await this.orderModel
        .findById(orderObjectId, {
          reward_id: 1,
          order_status: 1,
          customer_id: 1,
          coupon_id: 1,
        })
        .populate('coupon_id');

      console.log('order details', orderDetails);
      if (
        orderDetails?.reward_id &&
        orderDetails.order_status !== 'Partially_Cancelled'
      ) {
        const rewardDetails: any = await this.rewardModel.findOne(
          { _id: orderDetails.reward_id, is_credit: true },
          { points_earned: 1, earned_amount_wallet: 1 },
        );

        if (rewardDetails) {
          const customer: any = await this.customerModel.findById(
            orderDetails.customer_id,
          );

          const updatedRewardWallet = Math.max(
            (customer.reward_wallet ?? 0) - rewardDetails.points_earned,
            0,
          );
          const updatedRewardAmountWallet = Math.max(
            (customer.reward_amount_wallet ?? 0) -
            rewardDetails.earned_amount_wallet,
            0,
          );

          const updateData = {
            reward_wallet: updatedRewardWallet,
            reward_amount_wallet: updatedRewardAmountWallet,
          };
          if (orderDetails?.coupon_id?.coupon_code?.toLowerCase() == 'cb') {
            await this.customerModel.findByIdAndUpdate(
              orderDetails.customer_id,
              { $unset: { cashback_details: 1 } },
              { strict: false },
            );
          }
          await this.customerModel.findByIdAndUpdate(
            orderDetails.customer_id,
            updateData,
          );

          await this.rewardModel.create({
            customer_id: orderDetails.customer_id,
            loyalty_benefits: 'Cancel Order',
            is_credit: false,
            status: 'completed',
            order_id: orderObjectId,
            redeem_points: rewardDetails.points_earned,
            redeem_amount_wallet: rewardDetails.earned_amount_wallet,
          });
        }
      }

      // Update order status to cancelled with calculated cancellation_details
      await this.orderModel.findByIdAndUpdate(orderObjectId, {
        cancelAt: new Date(),
        order_status: 'Cancelled',
        cancelled_by_name,
        cancelled_by_email,
        reason,
        refund,
        details,
        cancellation_details,
      });

      // Remove deliveries associated with the subscription
      await this.deliveryModel.deleteMany({
        subscription_id: subscriptionObjectId,
      });

      // Log history
      const beforeChange = {
        meal_plan_days_before: cancellation_details.meal_plan_days_before,
        previous_end_date: cancellation_details.previous_end_date,
      };

      const afterChange = {
        meal_plan_days_now: cancellation_details.meal_plan_days_now,
        new_end_date: cancellation_details.new_end_date,
        cancellation_start_date: cancellation_details?.cancellation_start_date,
        cancellation_end_date: cancellation_details?.cancellation_end_date,
      };

      const changedBy = {
        name: cancelled_by_name,
        email: cancelled_by_email,
      };

      const changeDetails = {
        customer_id: orderDetails.customer_id,
        order_id: orderId,
        order_number: orderDetails.order_number,
        subscription_id: subscriptionId,
      };

      //order history
      if (editDetails?.type != 'no_change' || editDetails?.price != 0) {
        const payload1 = {
          customer_id:
            new mongoose.Types.ObjectId(orderDetails?.customer_id) || null,
          order_id: new mongoose.Types.ObjectId(orderId) || null,
          subscription_id: new mongoose.Types.ObjectId(subscriptionId) || null,
          amount: Math.abs(editDetails?.price) || 0,
          is_credit:
            editDetails?.type == 'receive'
              ? true
              : editDetails?.type == 'pay' && false,
          payment_status:
            editDetails?.type == 'receive'
              ? 'Success'
              : editDetails?.type == 'pay' && 'Refund',
          payment_type: 'Cancel Plan',
          details: {
            before_change: beforeChange,
            after_change: afterChange,
          },
        };
        await this.orderHistoryModel.create(payload1);
      }

      await this.adminHistoryModel.create({
        type: 'ORDER_COMPLETE_CANCELLATION',
        before_change: beforeChange,
        after_change: afterChange,
        changed_by: changedBy,
        change_details: changeDetails,
      });

      return {
        message: 'Subscription Cancelled Successfully!',
      };
    } catch (err) {
      console.error('Error in completeSubscriptionCancel:', err);
      throw new Error('Failed to cancel subscription.');
    }
  }

  async initiateBagRefund(dto: InitiateBagRefundDto) {
    try {
      // Find the most recent subscription for the customer
      const currentDate = new Date(
        moment(new Date()).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
      );

      const toCreateHistoryOrNot = await this.subscriptionModel.find({
        $and: [
          {
            end_date: {
              $gte: currentDate,
            },
          },
        ],
        is_cancle: false,
        customer_id: new mongoose.Types.ObjectId(dto.customer_id),
        is_refundable: true,
      });
      // Update Subscription
      await this.subscriptionModel.updateMany(
        {
          $and: [
            {
              end_date: {
                $gte: currentDate,
              },
            },
          ],
          is_cancle: false,
          customer_id: new mongoose.Types.ObjectId(dto.customer_id),
        },
        {
          $set: {
            is_refundable: false,
          },
        },
      );

      // Calculate dateVary
      const dateVary = handleDubai11Time(1);

      // Update AWB
      await this.awbModel.updateMany(
        {
          'refund_bag_details.customer_id': dto.customer_id,
          transcorp_date: { $gte: dateVary },
        },
        {
          $set: {
            'refund_bag_details.customerDetails.$[element].bag_opted': false,
          },
        },
        {
          arrayFilters: [
            { 'element.customer_id': dto.customer_id }, // Match elements in the array
          ],
        },
      );
      if (toCreateHistoryOrNot.length > 0) {
        const payload1 = {
          customer_id: new mongoose.Types.ObjectId(dto?.customer_id) || null,
          order_id:
            new mongoose.Types.ObjectId(toCreateHistoryOrNot?.[0]?.order_id) ||
            null,
          subscription_id:
            new mongoose.Types.ObjectId(toCreateHistoryOrNot?.[0]?._id) || null,
          amount: 100,
          is_credit: false,
          payment_status: 'Success',
          payment_type: 'Refund Cooler Bag',
          details: {},
        };
        await this.orderHistoryModel.create(payload1);
      }
      // If no subscription found, return success without updates
      return;
    } catch (error) {
      console.error('Error in initiateBagRefund:', error);
      throw error;
    }
  }
  async checkBagDeposit(dto: InitiateBagRefundDto) {
    try {
      // Find most recent subscription for the customer
      const latestSubscription = await this.subscriptionModel
        .findOne(
          { customer_id: new mongoose.Types.ObjectId(dto.customer_id) },
          { _id: 1, is_refundable: 1 },
        )
        .sort({ createdAt: -1 })
        .lean();

      // Default value if no subscription found
      let dataValue = false;

      // Check if subscription exists and is refundable
      if (latestSubscription) {
        dataValue = Boolean(latestSubscription.is_refundable);
      }

      return dataValue;
    } catch (error) {
      console.error('Error in checkBagDeposit:', error);
      throw error;
    }
  }

  async getCalculatedPrice(body: CalculatedMealPriceDto) {
    let price: number = 0;
    let typeOfPayment = 'no_change';
    const deliveries: Array<number> = [];

    const {
      subsPrices,
      subsFixPrices,
      orderData,
      mealSize,
      proteinCategory,
      subscriptionData,
    } = await customerAllDetails(
      body,
      this.SubscriptionsPricesModel,
      this.SubscriptionsFixPricesModel,
      this.subscriptionModel,
      this.orderModel,
    );

    let deliveryPrices = subscriptionData?.delivery_total;

    const todayDate = moment(new Date())?.utcOffset(240);
    const todayHour = todayDate?.hours();

    if (body?.type == 'meal_edit') {
      const finalMealEditData = await helperMealEdit(
        body,
        this.deliveryModel,
        subscriptionData,
        subsPrices,
        subsFixPrices,
        mealSize,
        proteinCategory,
        deliveryPrices,
      );
      price = finalMealEditData?.price;
      typeOfPayment = finalMealEditData?.typeOfPayment;
      if (finalMealEditData?.typeOfPayment != 'no_change') {
        deliveryPrices = finalMealEditData?.deliveries;
      }
    } else if (body?.type == 'diet_edit') {
      const finalDietEditData = await helperDietEdit(
        body,
        this.deliveryModel,
        subscriptionData,
        subsPrices,
        subsFixPrices,
        mealSize,
        proteinCategory,
        deliveryPrices,
      );
      price = finalDietEditData?.price;
      typeOfPayment = finalDietEditData?.typeOfPayment;
      if (finalDietEditData?.typeOfPayment != 'no_change') {
        deliveryPrices = finalDietEditData?.deliveries;
      }
    } else if (body?.type == 'cancel_edit') {
      const finalCancelData = await helperCancelEdit(
        body,
        this.deliveryModel,
        subscriptionData,
      );
      price = finalCancelData?.price;
      typeOfPayment = finalCancelData?.typeOfPayment;

      if (finalCancelData?.typeOfPayment != 'no_change') {
        deliveryPrices = finalCancelData?.deliveries;
      }
    }
    return {
      price: Number(price?.toFixed(2)) || 0,
      type: typeOfPayment,
      deliveries: deliveryPrices,
    };
  }
}

/////////////////////////////////////////////////
/////////////current logic helper////////////////
/////////////  required for now  ////////////////
/////////////////////////////////////////////////
const helperPricePerDay = (
  subsPrices,
  mealSize,
  proteinCategory,
  subscriptionData,
  noOfMeals = 1,
) => {
  const filterSubPrice = subsPrices?.filter(
    (priceItm) =>
      priceItm?.number_of_meal == noOfMeals &&
      priceItm?.meal_type == mealSize &&
      priceItm?.protein_category == proteinCategory,
  );
  const pricePerDay =
    filterSubPrice?.[0]?.[`day_${subscriptionData?.plan_duration_in_days}`] /
    parseInt(subscriptionData?.plan_duration_in_days);
  return pricePerDay / noOfMeals;
};

const customerAllDetails = async (
  body,
  SubscriptionsPricesModel,
  SubscriptionsFixPricesModel,
  subscriptionModel,
  orderModel,
) => {
  const subsPrices = await SubscriptionsPricesModel.find({
    meal_tag: 'None',
  });
  const subsFixPrices = await SubscriptionsFixPricesModel.find({});
  const subscriptionData = await subscriptionModel.findById(
    new mongoose.Types.ObjectId(body?.subscription_id),
    'selected_meal_type selected_meal plan_duration_in_days delivery_total actual_delivery_total',
  );
  const orderData = await orderModel.findById(
    new mongoose.Types.ObjectId(body?.order_id),
    'final_order_total',
  );
  const mealSize = subscriptionData?.selected_meal_type?.[0]?.kcal_range;
  const proteinCategory =
    subscriptionData?.selected_meal_type?.[0]?.protein_category || 'balance';

  return {
    subsPrices,
    subsFixPrices,
    orderData,
    mealSize,
    proteinCategory,
    subscriptionData,
  };
};

const helperUpgradeTheMeal = async (
  commonData,
  tempSelectedMeal,
  subscriptionData,
  subsFixPrices,
  subsPrices,
  mealSize,
  proteinCategory,
  totalDays,
  tempDeliveryPrices,
  deliveryPrices,
  deliverySelectedMeal,
  tempActualDeliveryPrices,
  apply_discount = false,
) => {
  const addedMeal = [
    ...new Set(tempSelectedMeal.filter((item) => !commonData?.includes(item))),
  ];

  const pricesPerDayForUpgradation: Array<Record<string, number>> = [];
  let totalPrices: number = 0;
  const noOfMeals = [
    ...new Set([
      // ...subscriptionData?.selected_meal,
      ...addedMeal,
    ]),
  ]?.filter((mealItm) => mealItm == 'lunch' || mealItm == 'dinner')?.length;

  const actualPriceTotal = tempActualDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  const priceTotal = tempDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  let discount = (actualPriceTotal - priceTotal) / (actualPriceTotal || 1);
  if (discount < 0) discount = 0;
  console.log('discount===>', discount);
  const costPerMeal = helperPricePerMeal(
    apply_discount ? discount : 0,
    subsPrices,
    subsFixPrices,
    mealSize,
    proteinCategory,
    subscriptionData,
    noOfMeals,
  );

  console.log(
    'costPerMeal====>',
    costPerMeal?.breakfast,
    costPerMeal?.morning_snack,
    costPerMeal?.evening_snack,
    costPerMeal?.lunch,
  );

  deliverySelectedMeal?.map((selectItm) => {
    const pricesTemp: any = {
      breakfast: 0,
      morning_snack: 0,
      evening_snack: 0,
      lunch: 0,
      dinner: 0,
    };
    addedMeal?.map((addItm) => {
      if (addItm == 'breakfast') {
        const isPresent = !selectItm?.selected_meal.includes('breakfast');
        if (isPresent) {
          pricesTemp.breakfast = Number(costPerMeal?.breakfast || 0);
          totalPrices += Number(costPerMeal?.breakfast || 0);
        }
      } else if (addItm == 'morning_snack') {
        const isPresent = !selectItm?.selected_meal.includes('morning_snack');
        if (isPresent) {
          pricesTemp.morning_snack = Number(costPerMeal?.morning_snack || 0);
          totalPrices += Number(costPerMeal?.morning_snack || 0);
        }
      } else if (addItm == 'evening_snack') {
        const isPresent = !selectItm?.selected_meal.includes('evening_snack');
        if (isPresent) {
          pricesTemp.evening_snack = Number(costPerMeal?.evening_snack || 0);
          totalPrices += Number(costPerMeal?.evening_snack || 0);
        }
      } else if (addItm == 'lunch' || addItm == 'dinner') {
        // const pricePerDay = helperPricePerDay(
        //   subsPrices,
        //   mealSize,
        //   proteinCategory,
        //   subscriptionData,
        //   noOfMeals,
        // );
        if (addItm == 'lunch') {
          const isPresent = !selectItm?.selected_meal.includes('lunch');
          if (isPresent) {
            pricesTemp.lunch = costPerMeal?.lunch || 0;
            totalPrices += costPerMeal?.lunch || 0;
          }
        }
        if (addItm == 'dinner') {
          const isPresent = !selectItm?.selected_meal.includes('dinner');
          if (isPresent) {
            pricesTemp.dinner = costPerMeal?.dinner || 0;
            totalPrices += costPerMeal?.dinner || 0;
          }
        }
      }
    });

    pricesPerDayForUpgradation?.push(pricesTemp);
  });

  for (let i = 0; i < tempDeliveryPrices?.length; i++) {
    tempDeliveryPrices[i] +=
      pricesPerDayForUpgradation?.[i]?.breakfast +
      pricesPerDayForUpgradation?.[i]?.lunch +
      pricesPerDayForUpgradation?.[i]?.dinner +
      pricesPerDayForUpgradation?.[i]?.morning_snack +
      pricesPerDayForUpgradation?.[i]?.evening_snack;
  }

  const deliveryPricesData = [
    ...deliveryPrices?.slice(
      0,
      deliveryPrices?.length - tempDeliveryPrices?.length,
    ),
    ...tempDeliveryPrices,
  ];

  return {
    price: totalPrices,
    deliveries: deliveryPricesData,
  };
};

const helperDegradeTheMeal = async (
  commonData,
  subscriptionData,
  tempSelectedMeal,
  tempActualDeliveryPrices,
  tempDeliveryPrices,
  subsPrices,
  subsFixPrices,
  mealSize,
  proteinCategory,
  deliverySelectedMeal,
  deliveryPrices,
) => {
  const removedMeal = [
    ...new Set(
      subscriptionData?.selected_meal.filter(
        (item) => !commonData?.includes(item),
      ),
    ),
  ];
  const noOfMeals = [
    ...new Set([...subscriptionData?.selected_meal, ...removedMeal]),
  ]?.filter((mealItm) => mealItm == 'lunch' || mealItm == 'dinner')?.length;
  const actualPriceTotal = tempActualDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  const priceTotal = tempDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  let discount = (actualPriceTotal - priceTotal) / (actualPriceTotal || 1);
  if (discount < 0) discount = 0;

  const costPerMeal = helperPricePerMeal(
    discount,
    subsPrices,
    subsFixPrices,
    mealSize,
    proteinCategory,
    subscriptionData,
    noOfMeals,
  );

  const pricesPerDayForDegradation: Array<Record<string, number>> = [];
  let totalPrices: number = 0;
  deliverySelectedMeal?.map((selectItm) => {
    const pricesTemp = {
      breakfast: 0,
      morning_snack: 0,
      evening_snack: 0,
      lunch: 0,
      dinner: 0,
    };
    removedMeal?.map((removedItm) => {
      if (removedItm == 'breakfast') {
        const isPresent = selectItm?.selected_meal.includes('breakfast');
        if (isPresent) {
          pricesTemp.breakfast =
            costPerMeal?.breakfast > 0 ? costPerMeal?.breakfast : 0;
          if (!selectItm?.extra_delivery) {
            totalPrices += costPerMeal?.breakfast;
          }
        }
      } else if (removedItm == 'morning_snack') {
        const isPresent = selectItm?.selected_meal.includes('morning_snack');
        if (isPresent) {
          pricesTemp.morning_snack =
            costPerMeal?.morning_snack > 0 ? costPerMeal?.morning_snack : 0;
          if (!selectItm?.extra_delivery) {
            totalPrices += costPerMeal?.morning_snack;
          }
        }
      } else if (removedItm == 'evening_snack') {
        const isPresent = selectItm?.selected_meal.includes('evening_snack');
        if (isPresent) {
          pricesTemp.evening_snack =
            costPerMeal?.evening_snack > 0 ? costPerMeal?.evening_snack : 0;
          if (!selectItm?.extra_delivery) {
            totalPrices += costPerMeal?.evening_snack;
          }
        }
      } else if (removedItm == 'lunch') {
        const isPresent = selectItm?.selected_meal.includes('lunch');
        if (isPresent) {
          pricesTemp.lunch = costPerMeal?.lunch > 0 ? costPerMeal?.lunch : 0;
          if (!selectItm?.extra_delivery) {
            totalPrices += costPerMeal?.lunch;
          }
        }
      } else if (removedItm == 'dinner') {
        const isPresent = selectItm?.selected_meal.includes('dinner');
        if (isPresent) {
          pricesTemp.dinner = costPerMeal?.dinner > 0 ? costPerMeal?.dinner : 0;
          if (!selectItm?.extra_delivery) {
            totalPrices += costPerMeal?.dinner;
          }
        }
      }
    });

    pricesPerDayForDegradation?.push(pricesTemp);
  });

  for (let i = 0; i < tempDeliveryPrices?.length; i++) {
    tempDeliveryPrices[i] = parseFloat(
      (
        tempDeliveryPrices[i] -
        (pricesPerDayForDegradation?.[i]?.breakfast +
          pricesPerDayForDegradation?.[i]?.lunch +
          pricesPerDayForDegradation?.[i]?.dinner +
          pricesPerDayForDegradation?.[i]?.morning_snack +
          pricesPerDayForDegradation?.[i]?.evening_snack)
      ).toFixed(2),
    );

    if (tempDeliveryPrices[i] < 0) {
      tempDeliveryPrices[i] = 0;
    }
  }

  const deliveryPricesData = [
    ...deliveryPrices?.slice(
      0,
      deliveryPrices?.length - tempDeliveryPrices?.length,
    ),
    ...tempDeliveryPrices,
  ];

  return {
    price: totalPrices,
    deliveries: deliveryPricesData,
  };
};

const helperMealEdit = async (
  body,
  deliveryModel,
  subscriptionData,
  subsPrices,
  subsFixPrices,
  mealSize,
  proteinCategory,
  deliveryPrices,
) => {
  assertMandatoryMealsPresent(body?.selected_meal, proteinCategory);

  let price: number = 0;
  let typeOfPayment: string = 'no_change';
  let deliveries: Array<number> = [];
  const tempSelectedMeal = mergeSelectedMealsWithMandatory(
    body?.selected_meal,
    proteinCategory,
  );

  const commonData = findCommonStrings(
    subscriptionData?.selected_meal,
    tempSelectedMeal,
  );
  console.log('common data', commonData);

  const deliveryDate = moment(body?.partialStartDate)?.utcOffset(240)?.toDate();
  console.log('deliveryDate', deliveryDate);

  const deliverySelectedMeal: Array<Record<string, any>> = await deliveryModel
    .find(
      {
        subscription_id: new mongoose.Types.ObjectId(body?.subscription_id),
        is_delivery_freezed: false,
        not_deliverable: false,
        delivery_date: {
          $gte: moment(deliveryDate).startOf('day').toDate(),
        },
      },
      { selected_meal: 1, _id: 0, extra_delivery: 1 },
    )
    .sort({ delivery_date: 1 });
  console.log('deliverySelectedMeal', deliverySelectedMeal);

  const totalDays = deliverySelectedMeal?.length;
  console.log('totalDays', totalDays);

  const tempActualDeliveryPrices =
    subscriptionData?.actual_delivery_total?.slice(
      subscriptionData?.actual_delivery_total?.length - totalDays,
    );
  console.log('tempActualDeliveryPrices', tempActualDeliveryPrices);

  const tempDeliveryPrices = subscriptionData?.delivery_total?.slice(
    subscriptionData?.delivery_total?.length - totalDays,
  );
  console.log('tempDeliveryPrices', tempDeliveryPrices);

  // if (beforePrice > afterPrice) {
  const decreasePlan = await helperDegradeTheMeal(
    commonData,
    subscriptionData,
    tempSelectedMeal,
    tempActualDeliveryPrices,
    tempDeliveryPrices,
    subsPrices,
    subsFixPrices,
    mealSize,
    proteinCategory,
    deliverySelectedMeal,
    deliveryPrices,
  );
  console.log('decreasePlan', decreasePlan);
  price -= Number(decreasePlan.price.toFixed(2));
  console.log('price after degrade', decreasePlan.price.toFixed(2), price);
  deliveries = decreasePlan?.deliveries;
  console.log('deliveries data degrade', deliveries);
  // typeOfPayment = 'pay';
  // } else if (beforePrice < afterPrice) {
  const increasePlan = await helperUpgradeTheMeal(
    commonData,
    tempSelectedMeal,
    subscriptionData,
    subsFixPrices,
    subsPrices,
    mealSize,
    proteinCategory,
    totalDays,
    tempDeliveryPrices,
    deliveryPrices,
    deliverySelectedMeal,
    tempActualDeliveryPrices,
    body?.apply_discount,
  );
  console.log('increasePlan', increasePlan);
  price += Number(increasePlan.price.toFixed(2));
  console.log('price after upgrade', increasePlan.price.toFixed(2), price);
  deliveries = increasePlan?.deliveries;
  console.log('deliveries data upgrade', deliveries);
  // typeOfPayment = 'receive';
  // }
  if (price > 0) {
    typeOfPayment = 'receive';
  } else if (price < 0) {
    typeOfPayment = 'pay';
  }
  price = Math.abs(price);
  return {
    price,
    typeOfPayment,
    deliveries,
  };
};

const helperPricePerMeal = (
  discount,
  subsPrices,
  subsFixPrices,
  mealSize,
  proteinCategory,
  subscriptionData,
  noOfMeals = 1,
) => {
  const pricePerDay = helperPricePerDay(
    subsPrices,
    mealSize,
    proteinCategory,
    subscriptionData,
    noOfMeals,
  );
  return {
    lunch: pricePerDay * (1 - discount),
    dinner: pricePerDay * (1 - discount),
    breakfast: parseInt(subsFixPrices?.[0]?.breakfast) * (1 - discount),
    evening_snack: parseInt(subsFixPrices?.[0]?.evening_snack) * (1 - discount),
    morning_snack: parseInt(subsFixPrices?.[0]?.morning_snack) * (1 - discount),
  };
};

const helperUpgradeTheDiet = async (
  body,
  deliverySelectedMeal,
  subscriptionData,
  subsFixPrices,
  subsPrices,
  mealSize,
  proteinCategory,
  noOfMeals,
  tempDeliveryPrices,
  deliveryPrices,
  tempActualDeliveryPrices,
  apply_discount = false,
) => {
  let price: number = 0;
  const pricesPerDayForDietUpgradation: Array<Record<string, any>> = [];

  let previoustotalPrices: number = 0;
  let currenttotalPrices: number = 0;
  const actualPriceTotal = tempActualDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  const priceTotal = tempDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  let discount = (actualPriceTotal - priceTotal) / (actualPriceTotal || 1);
  if (discount < 0) discount = 0;
  console.log('discount==>', discount);

  const costPerMealBefore = helperPricePerMeal(
    apply_discount ? discount : 0,
    subsPrices,
    subsFixPrices,
    mealSize,
    proteinCategory,
    subscriptionData,
    noOfMeals,
  );
  const costPerMealAfter = helperPricePerMeal(
    apply_discount ? discount : 0,
    subsPrices,
    subsFixPrices,
    body?.kcal_range,
    body?.protein_category,
    subscriptionData,
    noOfMeals,
  );
  console.log(
    'cost per meal before and after',
    costPerMealBefore,
    costPerMealAfter,
  );

  deliverySelectedMeal?.map((selectItm) => {
    const previousPricesTemp: Record<string, number> = {
      breakfast: 0,
      morning_snack: 0,
      evening_snack: 0,
      lunch: 0,
      dinner: 0,
    };
    const currentPriceTemp = {
      breakfast: 0,
      morning_snack: 0,
      evening_snack: 0,
      lunch: 0,
      dinner: 0,
    };

    subscriptionData?.selected_meal?.map((dietItm) => {
      if (dietItm == 'breakfast') {
        const isPresent = selectItm?.selected_meal.includes('breakfast');
        if (isPresent) {
          previousPricesTemp.breakfast = Number(costPerMealBefore?.breakfast);
          currentPriceTemp.breakfast = Number(costPerMealAfter?.breakfast);
          previoustotalPrices += Number(costPerMealBefore?.breakfast);
          currenttotalPrices += Number(costPerMealAfter?.breakfast);
          // totalPrices += parseInt(subsFixPrices?.[0]?.breakfast);
        }
      } else if (dietItm == 'morning_snack') {
        const isPresent = selectItm?.selected_meal.includes('morning_snack');
        if (isPresent) {
          previousPricesTemp.morning_snack = Number(
            costPerMealBefore?.morning_snack,
          );
          currentPriceTemp.morning_snack = Number(
            costPerMealAfter?.morning_snack,
          );
          previoustotalPrices += Number(costPerMealBefore?.morning_snack);
          currenttotalPrices += Number(costPerMealAfter?.morning_snack);
        }
      } else if (dietItm == 'evening_snack') {
        const isPresent = selectItm?.selected_meal.includes('evening_snack');
        if (isPresent) {
          previousPricesTemp.evening_snack = Number(
            costPerMealBefore?.evening_snack,
          );
          currentPriceTemp.evening_snack = Number(
            costPerMealAfter?.evening_snack,
          );

          previoustotalPrices += Number(costPerMealBefore?.evening_snack);
          currenttotalPrices += Number(costPerMealAfter?.evening_snack);
        }
      } else if (dietItm == 'lunch' || dietItm == 'dinner') {
        // const pricePerDayBefore = helperPricePerDay(
        //   subsPrices,
        //   mealSize,
        //   proteinCategory,
        //   subscriptionData,
        //   noOfMeals,
        // );
        // const pricePerDayAfter = helperPricePerDay(
        //   subsPrices,
        //   body?.kcal_range,
        //   body?.protein_category,
        //   subscriptionData,
        //   noOfMeals,
        // );

        if (dietItm == 'lunch') {
          const isPresent = selectItm?.selected_meal.includes('lunch');
          if (isPresent) {
            previousPricesTemp.lunch = costPerMealBefore?.lunch;
            currentPriceTemp.lunch = costPerMealAfter?.lunch;
            previoustotalPrices += costPerMealBefore?.lunch;
            currenttotalPrices += costPerMealAfter?.lunch;
          }
        }
        if (dietItm == 'dinner') {
          const isPresent = selectItm?.selected_meal.includes('dinner');
          if (isPresent) {
            previousPricesTemp.dinner = costPerMealBefore?.dinner;
            currentPriceTemp.dinner = costPerMealAfter?.dinner;
            previoustotalPrices += costPerMealBefore?.dinner;
            currenttotalPrices += costPerMealAfter?.dinner;
          }
        }
      }
    });

    pricesPerDayForDietUpgradation?.push({
      lunch:
        currentPriceTemp?.lunch - previousPricesTemp?.lunch > 0
          ? currentPriceTemp?.lunch - previousPricesTemp?.lunch
          : 0,
      dinner:
        currentPriceTemp?.dinner - previousPricesTemp?.dinner > 0
          ? currentPriceTemp?.dinner - previousPricesTemp?.dinner
          : 0,
      breakfast:
        currentPriceTemp?.breakfast - previousPricesTemp?.breakfast > 0
          ? currentPriceTemp?.breakfast - previousPricesTemp?.breakfast
          : 0,
      morning_snack:
        currentPriceTemp?.morning_snack - previousPricesTemp?.morning_snack > 0
          ? currentPriceTemp?.morning_snack - previousPricesTemp?.morning_snack
          : 0,
      evening_snack:
        currentPriceTemp?.evening_snack - previousPricesTemp?.evening_snack > 0
          ? currentPriceTemp?.evening_snack - previousPricesTemp?.evening_snack
          : 0,
    });
  });

  for (let i = 0; i < tempDeliveryPrices?.length; i++) {
    tempDeliveryPrices[i] +=
      pricesPerDayForDietUpgradation?.[i]?.breakfast +
      pricesPerDayForDietUpgradation?.[i]?.lunch +
      pricesPerDayForDietUpgradation?.[i]?.dinner +
      pricesPerDayForDietUpgradation?.[i]?.morning_snack +
      pricesPerDayForDietUpgradation?.[i]?.evening_snack;
  }

  const deliveryPricesData = [
    ...deliveryPrices?.slice(
      0,
      deliveryPrices?.length - tempDeliveryPrices?.length,
    ),
    ...tempDeliveryPrices,
  ];
  price =
    currenttotalPrices - previoustotalPrices > 0
      ? currenttotalPrices - previoustotalPrices
      : 0;

  return {
    price,
    deliveries: deliveryPricesData,
  };
};

const helperDegradeTheDietWithoutDiscount = async (
  previousPrice,
  currentPrice,
  subscriptionData,
  subsFixPrices,
  totalDays,
) => {
  let beforeMealPrice = previousPrice;
  let afterMealPrice = currentPrice;
  console.log(
    'meal size and protein category',
    previousPrice,
    currentPrice,
    subscriptionData,
  );
  const remainingMeal = subscriptionData?.selected_meal?.filter(
    (selectItm) => selectItm != 'lunch' && selectItm != 'dinner',
  );
  console.log('remaining meal ', remainingMeal);
  let extraMealPrice = 0;
  remainingMeal?.map((remainItm) => {
    extraMealPrice +=
      parseInt(subscriptionData?.plan_duration_in_days) *
      parseInt(subsFixPrices?.[0]?.[`${remainItm}`]);
  });
  beforeMealPrice += extraMealPrice;
  afterMealPrice += extraMealPrice;
  console.log('before and after meal price', beforeMealPrice, afterMealPrice);
  const beforeDays =
    parseInt(subscriptionData?.plan_duration_in_days) - totalDays;
  const afterDays = totalDays;
  console.log('before and after days', beforeDays, afterDays);
  const priceAfterChange =
    (beforeMealPrice / parseInt(subscriptionData?.plan_duration_in_days || 1)) *
    beforeDays +
    (afterMealPrice / parseInt(subscriptionData?.plan_duration_in_days || 1)) *
    afterDays;
  const actualPaid = subscriptionData?.delivery_total?.reduce(
    (acc, num) => acc + num,
    0,
  );
  console.log('price change and actual paid', priceAfterChange, actualPaid);
  const finalPrice = priceAfterChange - actualPaid;
  console.log('final price', finalPrice);
  const quotient = Math.floor(
    priceAfterChange / parseInt(subscriptionData?.plan_duration_in_days),
  );
  const remainder =
    priceAfterChange % parseInt(subscriptionData?.plan_duration_in_days);

  const deliveriesArray = Array.from(
    { length: parseInt(subscriptionData?.plan_duration_in_days) },
    (_, i) => (i < remainder ? quotient + 1 : quotient),
  );
  console.log('delivery array', deliveriesArray);
  return {
    price: Math.abs(finalPrice),
    deliveries: deliveriesArray,
    typeOfPayment: finalPrice > 0 ? 'receive' : 'pay',
  };
};

const helperDegradeTheDiet = async (
  body,
  tempActualDeliveryPrices,
  tempDeliveryPrices,
  subsPrices,
  subsFixPrices,
  mealSize,
  proteinCategory,
  subscriptionData,
  noOfMeals,
  deliverySelectedMeal,
  deliveryPrices,
) => {
  let price: number = 0;
  const actualPriceTotal = tempActualDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  const priceTotal = tempDeliveryPrices?.reduce(
    (sum, num) => sum + num * (100 / 105),
    0,
  );
  let discount = (actualPriceTotal - priceTotal) / (actualPriceTotal || 1);
  if (discount < 0) discount = 0;

  const costPerMealBefore = helperPricePerMeal(
    discount,
    subsPrices,
    subsFixPrices,
    mealSize,
    proteinCategory,
    subscriptionData,
    noOfMeals,
  );
  const costPerMealAfter = helperPricePerMeal(
    discount,
    subsPrices,
    subsFixPrices,
    body?.kcal_range,
    body?.protein_category,
    subscriptionData,
    noOfMeals,
  );

  const differenceCost = {
    lunch:
      costPerMealBefore?.lunch - costPerMealAfter?.lunch > 0
        ? costPerMealBefore?.lunch - costPerMealAfter?.lunch
        : 0,
    dinner:
      costPerMealBefore?.dinner - costPerMealAfter?.dinner > 0
        ? costPerMealBefore?.dinner - costPerMealAfter?.dinner
        : 0,
    breakfast:
      costPerMealBefore?.breakfast - costPerMealAfter?.breakfast > 0
        ? costPerMealBefore?.breakfast - costPerMealAfter?.breakfast
        : 0,
    evening_snack:
      costPerMealBefore?.evening_snack - costPerMealAfter?.evening_snack > 0
        ? costPerMealBefore?.evening_snack - costPerMealAfter?.evening_snack
        : 0,
    morning_snack:
      costPerMealBefore?.morning_snack - costPerMealAfter?.morning_snack > 0
        ? costPerMealBefore?.morning_snack - costPerMealAfter?.morning_snack
        : 0,
  };

  console.log('difference cost', differenceCost);
  const pricesPerDayForDietDegradation: Array<Record<string, number>> = [];
  let totalPrices: number = 0;

  deliverySelectedMeal?.map((deliveryItm) => {
    const pricesTemp = {
      breakfast: 0,
      morning_snack: 0,
      evening_snack: 0,
      lunch: 0,
      dinner: 0,
    };
    subscriptionData?.selected_meal?.map((selectItm) => {
      if (selectItm == 'breakfast') {
        const isPresent = deliveryItm?.selected_meal?.includes('breakfast');

        if (isPresent) {
          pricesTemp.breakfast =
            differenceCost?.breakfast > 0 ? differenceCost?.breakfast : 0;
          if (!deliveryItm?.extra_delivery) {
            totalPrices += differenceCost?.breakfast;
          }
        }
      } else if (selectItm == 'morning_snack') {
        const isPresent = deliveryItm?.selected_meal?.includes('morning_snack');

        if (isPresent) {
          pricesTemp.morning_snack =
            differenceCost?.morning_snack > 0
              ? differenceCost?.morning_snack
              : 0;
          if (!deliveryItm?.extra_delivery) {
            totalPrices += differenceCost?.morning_snack;
          }
        }
      } else if (selectItm == 'evening_snack') {
        const isPresent = deliveryItm?.selected_meal?.includes('evening_snack');

        if (isPresent) {
          pricesTemp.evening_snack =
            differenceCost?.evening_snack > 0
              ? differenceCost?.evening_snack
              : 0;
          if (!deliveryItm?.extra_delivery) {
            totalPrices += differenceCost?.evening_snack;
          }
        }
      } else if (selectItm == 'lunch') {
        const isPresent = deliveryItm?.selected_meal?.includes('lunch');

        if (isPresent) {
          pricesTemp.lunch =
            differenceCost?.lunch > 0 ? differenceCost?.lunch : 0;
          if (!deliveryItm?.extra_delivery) {
            totalPrices += differenceCost?.lunch;
          }
        }
      } else if (selectItm == 'dinner') {
        const isPresent = deliveryItm?.selected_meal?.includes('dinner');

        if (isPresent) {
          pricesTemp.dinner =
            differenceCost?.dinner > 0 ? differenceCost?.dinner : 0;
          if (!deliveryItm?.extra_delivery) {
            totalPrices += differenceCost?.dinner;
          }
        }
      }
    });

    pricesPerDayForDietDegradation?.push(pricesTemp);
  });
  console.log(
    'pricesPerDayForDietDegradation==>',
    pricesPerDayForDietDegradation,
  );
  for (let i = 0; i < tempDeliveryPrices?.length; i++) {
    tempDeliveryPrices[i] =
      tempDeliveryPrices[i] -
      parseFloat(
        (
          pricesPerDayForDietDegradation?.[i]?.breakfast +
          pricesPerDayForDietDegradation?.[i]?.lunch +
          pricesPerDayForDietDegradation?.[i]?.dinner +
          pricesPerDayForDietDegradation?.[i]?.morning_snack +
          pricesPerDayForDietDegradation?.[i]?.evening_snack
        ).toFixed(2),
      );

    if (tempDeliveryPrices[i] < 0) {
      tempDeliveryPrices[i] = 0;
    }
  }

  const deliveryPricesData = [
    ...deliveryPrices?.slice(
      0,
      deliveryPrices?.length - tempDeliveryPrices?.length,
    ),
    ...tempDeliveryPrices,
  ];
  const typeOfPayment = totalPrices > 0 ? 'pay' : 'receive';
  price = Math.abs(totalPrices);

  return {
    price,
    deliveries: deliveryPricesData,
    typeOfPayment: typeOfPayment,
  };
};

const helperDietEdit = async (
  body,
  deliveryModel,
  subscriptionData,
  subsPrices,
  subsFixPrices,
  mealSize,
  proteinCategory,
  deliveryPrices,
) => {
  let price: number = 0;
  let deliveries: Array<number> = [];
  let typeOfPayment: string = 'no_change';
  const todayDate = new Date();
  const dubaiTime = moment(todayDate).utcOffset(4 * 60); // 4 hours in minutes
  const deliveryDate =
    dubaiTime.hours() < 12
      ? moment(todayDate).add(2, 'days').startOf('day').toDate()
      : moment(todayDate).add(3, 'days').startOf('day').toDate();
  const deliverySelectedMeal: Array<Record<string, any>> = await deliveryModel
    .find(
      {
        subscription_id: new mongoose.Types.ObjectId(body?.subscription_id),
        is_delivery_freezed: false,
        not_deliverable: false,
        delivery_date: {
          $gte: moment(deliveryDate).startOf('day').toDate(),
        },
      },
      { selected_meal: 1, _id: 0, extra_delivery: 1 },
    )
    .sort({ delivery_date: 1 });

  const totalDays = deliverySelectedMeal?.length;

  const tempActualDeliveryPrices =
    subscriptionData?.actual_delivery_total?.slice(
      subscriptionData?.actual_delivery_total?.length - totalDays,
    );
  const tempDeliveryPrices = subscriptionData?.delivery_total?.slice(
    subscriptionData?.delivery_total?.length - totalDays,
  );

  const noOfMeals = subscriptionData?.selected_meal?.filter(
    (selectItm) => selectItm == 'lunch' || selectItm == 'dinner',
  )?.length;

  const previousPrice = subsPrices?.filter(
    (priceItm) =>
      priceItm?.number_of_meal == noOfMeals &&
      priceItm?.meal_type == mealSize &&
      priceItm?.protein_category == proteinCategory,
  )?.[0]?.[`day_${Number(subscriptionData?.plan_duration_in_days)}`];
  const currentPrice = subsPrices?.filter(
    (priceItm) =>
      priceItm?.number_of_meal == noOfMeals &&
      priceItm?.meal_type == body?.kcal_range &&
      priceItm?.protein_category == body?.protein_category,
  )?.[0]?.[`day_${Number(subscriptionData?.plan_duration_in_days)}`];

  if (previousPrice > currentPrice) {
    // if (!body?.apply_discount) {
    //   const decreasePlanWithoutDiscount =
    //     await helperDegradeTheDietWithoutDiscount(
    //       previousPrice,
    //       currentPrice,
    //       subscriptionData,
    //       subsFixPrices,
    //       totalDays,
    //     );
    //   price = decreasePlanWithoutDiscount?.price;
    //   deliveries = decreasePlanWithoutDiscount?.deliveries;
    //   typeOfPayment = decreasePlanWithoutDiscount?.typeOfPayment;
    // } else {
    const decreasePlan = await helperDegradeTheDiet(
      body,
      tempActualDeliveryPrices,
      tempDeliveryPrices,
      subsPrices,
      subsFixPrices,
      mealSize,
      proteinCategory,
      subscriptionData,
      noOfMeals,
      deliverySelectedMeal,
      deliveryPrices,
    );
    price = decreasePlan?.price;
    deliveries = decreasePlan?.deliveries;
    typeOfPayment = decreasePlan?.typeOfPayment;
    // }
  } else if (previousPrice < currentPrice) {
    const increasePlan = await helperUpgradeTheDiet(
      body,
      deliverySelectedMeal,
      subscriptionData,
      subsFixPrices,
      subsPrices,
      mealSize,
      proteinCategory,
      noOfMeals,
      tempDeliveryPrices,
      deliveryPrices,
      tempActualDeliveryPrices,
      body?.apply_discount,
    );
    price = increasePlan?.price;
    deliveries = increasePlan?.deliveries;
    typeOfPayment = 'receive';
  }

  return {
    price,
    deliveries,
    typeOfPayment,
  };
};

const helperCancelEdit = async (body, deliveryModel, subscriptionData) => {
  let price: number = 0;
  let typeOfPayment: string = 'no_change';
  let deliveries: Array<number> = [];
  if (body?.cancellation_type == 'partial') {
    const deliveryDate = moment(body?.startDate)?.utcOffset(240)?.toDate();
    const totalDays = await deliveryModel.countDocuments({
      subscription_id: new mongoose.Types.ObjectId(body?.subscription_id),
      not_deliverable: false,
      is_delivery_freezed: false,
      delivery_date: {
        $gte: deliveryDate,
      },
    });

    let toRefund = subscriptionData?.delivery_total
      ?.slice(subscriptionData?.delivery_total?.length - totalDays)
      .reduce((sum, num) => sum + num, 0);
    deliveries = subscriptionData?.delivery_total?.slice(
      0,
      subscriptionData?.delivery_total?.length - totalDays,
    );
    if (body?.charges) {
      toRefund =
        toRefund -
        subscriptionData?.actual_delivery_total?.reduce(
          (sum, num) => sum + num,
          0,
        ) *
        0.2;
    }
    price = Number(toRefund);
    typeOfPayment = 'pay';
  } else if (body?.cancellation_type == 'complete') {
    let toRefund = subscriptionData?.delivery_total?.reduce(
      (sum, num) => sum + num,
      0,
    );
    deliveries = [];
    if (body?.charges) {
      toRefund = toRefund * 0.8;
    }
    price = Number(toRefund);
    typeOfPayment = 'pay';
  }

  return {
    price,
    typeOfPayment,
    deliveries,
  };
};

// const priceChangeInMealEdit = (items, prices) => {
//   return items.reduce((total, selItm) => {
//     if (selItm === 'lunch' || selItm === 'dinner') {
//       return total + 1;
//     } else if (prices[0]?.[selItm] !== undefined) {
//       return total + Number(prices[0][selItm]);
//     }
//     return total;
//   }, 0);
// };

function findCommonStrings(arr1, arr2) {
  // Convert the first array to a Set for O(1) lookups
  const set1 = new Set(arr1);

  // Filter the second array to keep only elements that exist in the first array
  const commonStrings = arr2.filter((str) => set1.has(str));

  return commonStrings;
}
