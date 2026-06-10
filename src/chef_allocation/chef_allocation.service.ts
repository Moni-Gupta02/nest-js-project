import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { RecipeMenuDocument } from 'src/recipe-menu/Schemas/recipe_menu.schema';
import { ChefAllocationDocument } from './Schemas/chef_allocation.schema';
import * as moment from 'moment-timezone';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { UserDocument } from 'src/auth/Schemas/auth.schema';
import { message } from 'src/common/assets';
import { GetUserlistDto } from './dto/create-chef_allocation.dto';
import { NotificationHistoryDocument } from 'src/notification_history/schemas/notification_history.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';

@Injectable()
export class ChefAllocationService {
  constructor(
    @InjectModel('Recipe_Menu')
    private readonly recipeMenuModel: Model<RecipeMenuDocument>,
    @InjectModel('Chef_allocation')
    private readonly chefAllocationModel: Model<ChefAllocationDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('userKMS')
    private readonly userModel: Model<UserDocument>,
    @InjectModel('Notification_Histories')
    private readonly notificationHistoriesModel: Model<NotificationHistoryDocument>,
    private readonly notificationMasterService: NotificationMasterService,
  ) {}
  async chefAllocationFromRecipeMenu(
    date: string,
    menu_id: string,
  ): Promise<any> {
    const chefAllocationList = await this.chefAllocationModel.findOne({
      delivery_date: new Date(
        moment(date)
          .utcOffset(0, true)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .toISOString(),
      ),
      delivery_type: 'subscription',
    });
    // console.log('chefAllocationList', chefAllocationList);

    if (!chefAllocationList) {
      const mealList = await this.recipeMenuModel.findOne({
        _id: new mongoose.Types.ObjectId(menu_id),
      });

      const recipeIds = mealList?.recipe?.map(
        (item) => new mongoose.Types.ObjectId(item.recipe_id),
      );

      const recipeList = await this.recipeModel.find({
        _id: {
          $in: recipeIds,
        },
      });
      console.log('recipeList', recipeList.length);
      console.log('created recipe finally');
      const dateOfMonday = moment(date).day('Monday').format('YYYY-MM-DD');

      // Loop through each recipe in the meal list
      mealList.recipe?.forEach((recipe, index) => {
        // Find the matching recipe data from the recipe list
        const recipeData = recipeList.find(
          (item) => item._id.toString() === recipe.recipe_id.toString(),
        );

        if (!recipeData) {
          console.warn(
            `No matching recipe data found for recipe_id: ${recipe.recipe_id}`,
          );
          return; // Skip if no matching recipe is found
        }

        // console.log('Processing recipeData:', recipeData);

        // Generate data for 6 days starting from Monday
        const deliveryData = Array.from({ length: 6 }, (_, i) => {
          const currentDate = moment(dateOfMonday)
            .add(i, 'days')
            .format('YYYY-MM-DD');
          return {
            item: recipeData.dish_name,
            meal_code: index + 1,
            // chef_id: meal.chef_id, // Uncomment if needed
            meal_type: recipeData.meal_category,
            recipe_id: recipeData._id,
            delivery_date: currentDate,
            delivery_type: recipeData.category_type,
            notes: [],
            variant: [],
            plating: {
              plating_lead_name: null,
              plating_team: [],
              ready_to_plate: false,
            },
            is_finalized: false,
            pdf_link: [],
            internal_image: [],
            menu_allocation: true,
            menu_id: new mongoose.Types.ObjectId(menu_id),
          };
        });

        // Create the delivery data entries in the database
        Promise.all(
          deliveryData.map((data) =>
            this.chefAllocationModel.create(data).catch((err) => {
              console.error('Error creating delivery data:', err, data);
            }),
          ),
        ).then(() => {
          console.log(
            `Successfully created delivery data for recipe_id: ${recipe.recipe_id}`,
          );
        });
      });
      // return totalCount;
      return {
        message: message.chef_allocation.CHEF_ALLOCATION_FROM_MENU,
        status: true,
      };
    } else {
      console.log('Allready recipe Created');
      return {
        message: message.chef_allocation.CHEF_ALLOCATION_ALLREADY_MENU_CREATED,
        status: false,
      };
    }
  }

  async getChefAllocationMenu(date: string): Promise<any> {
    const chefAllocationList = await this.chefAllocationModel.findOne({
      delivery_date: new Date(
        moment(date)
          .utcOffset(0, true)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .toISOString(),
      ),
      delivery_type: 'subscription',
    });
    // console.log('chefAllocationList', chefAllocationList);

    if (!chefAllocationList) {
      return {
        message: message.chef_allocation.CHECK_CHEF_ALLOCATION_REMAIN,
        status: true,
      };
    } else {
      console.log('Allready recipe Created');
      return {
        message: message.chef_allocation.CHECK_CHEF_ALLOCATION_FROM_MENU,
        status: false,
      };
    }
  }

  async chefAllocationList(
    date: string,
    delivery_type: string,
  ): Promise<string[]> {
    console.log(date);
    const chefAllocationList = await this.chefAllocationModel.aggregate([
      {
        $match: {
          delivery_date: new Date(
            moment(date)
              .utcOffset(0, true)
              .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toISOString(),
          ),
          delivery_type: delivery_type || 'subscription',
        },
      },
      {
        $sort: { meal_index: 1 },
      },
      {
        $project: {
          _id: 1,
          item: 1,
          recipe_id: 1,
          meal_type: 1,
          delivery_date: 1,
          order: 1,
          chef: 1,
          chef_id: 1,
          // notes: 1,
          // variant:1,
          // plating: 1,
          // current_status: 1,
          // meal_index: 1,
          // meal_code: 1,
          // total_deliveries: 1,
          // avg_rating: 1,
          // pdf_link: 1,
          // total_reviewer:1,
          delivery_type: 1,
        },
      },
    ]);
    return chefAllocationList;
  }
  async chefList(query: GetUserlistDto): Promise<any> {
    // search, page = 1, limit = 10,
    const { sort = 'name', order, role } = query;

    const filter = { role: role };
    // const filter = { role: { $regex: role, $options: 'i' } };
    // if (search) {
    //   filter = {
    //     $or: [
    //       { name: { $regex: search, $options: 'i' } },
    //       { email: { $regex: search, $options: 'i' } },
    //     ],
    //   };
    // }
    const sortOrder = order ? (order == 1 ? 1 : -1) : -1;
    // const [users, totalUsers] = await Promise.all([
    //   await this.userModel
    //     .find(filter, { password: 0, updatedAt: 0 })
    //     .sort({ [sort]: sortOrder })
    //     .skip((page - 1) * limit)
    //     .limit(limit)
    //     .exec(),
    //   await this.userModel.countDocuments(filter).exec(),
    // ]);
    const users = await Promise.all(
      await this.userModel
        .find(filter, { name: 1, role: 1, email: 1 })
        .sort({ [sort]: sortOrder })
        .exec(),
    );
    // const totalPages = Math.ceil(totalUsers / limit);
    // console.log(users);
    return users;
    // return {
    //   users,
    // totalUsers,
    // totalPages,
    // currentPage: +page,
    // };
  }
  async weeklyChefAllocations(
    date: string,
    chef_id: string,
    recipe_ids: string[], // Now accepting an array of recipe IDs
    whole_week: boolean,
  ): Promise<any> {
    const dateOfMonday = moment(date).day('Monday').format('YYYY-MM-DD');
    const startOfWeek = moment(date).startOf('isoWeek').toDate(); // Start of the week (Monday)
    const endOfWeek = moment(date).endOf('isoWeek').toDate(); // End of the week (Sunday)

    // Convert `chef_id` to ObjectId
    const chefData = await this.userModel.findOne({
      _id: new mongoose.Types.ObjectId(chef_id),
    });
    const updateObject = {
      chef_id: new mongoose.Types.ObjectId(chef_id),
      chef: chefData?.name,
    };

    // Convert `recipe_ids` array to ObjectId array
    const recipeObjectIds = recipe_ids.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    let updateAllocation;

    if (moment(date).format('YYYY-MM-DD') === dateOfMonday && whole_week) {
      // If it's Monday and whole_week = true, update all dates in the week
      updateAllocation = {
        recipe_id: { $in: recipeObjectIds }, // Match any recipe in the list
        delivery_date: {
          $gte: startOfWeek, // Start of the week
          $lte: endOfWeek, // End of the week
        },
      };
    } else {
      // Otherwise, update for a specific date
      updateAllocation = {
        recipe_id: { $in: recipeObjectIds }, // Match any recipe in the list
        delivery_date: new Date(
          moment(date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toISOString(),
        ),
      };
    }

    console.log(
      'updateObject================================',
      updateAllocation,
      updateObject,
    );

    try {
      const result = await this.chefAllocationModel.updateMany(
        updateAllocation,
        { $set: updateObject }, // Use $set to update fields
      );

      console.log('Update result:', result);
      return result;
    } catch (error) {
      console.error('Error updating chef allocation:', error);
      throw new Error('Update failed'); // Throw an error for upstream handling
    }
  }
  async getWeeklyAllocations(date: string): Promise<any> {
    const chefAllocationList = await this.chefAllocationModel.aggregate([
      {
        $match: {
          delivery_date: new Date(
            moment(date)
              .utcOffset(0, true)
              .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toISOString(),
          ),
        },
      },
      {
        $group: {
          _id: '$chef_id',
          recipe: {
            $push: {
              recipe_id: '$recipe_id',
              dish_name: '$item',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'userkms',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $unwind: {
          path: '$userData',
        },
      },
      {
        $project: {
          chef_id: '$_id',
          recipe: 1,
          name: '$userData.name',
          email: '$userData.email',
        },
      },
    ]);
    return chefAllocationList;
  }

  async getWeeklyAllocationsNotification(date: string): Promise<any> {
    const chefAllocationList = await this.chefAllocationModel.aggregate([
      {
        $match: {
          delivery_date: new Date(
            moment(date)
              .utcOffset(0, true)
              .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
              .toISOString(),
          ),
        },
      },
      {
        $group: {
          _id: '$chef_id',
          recipe: {
            $push: {
              recipe_id: '$recipe_id',
              dish_name: '$item',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'userkms',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $unwind: {
          path: '$userData',
        },
      },
      {
        $project: {
          chef_id: '$_id',
          recipe: 1,
          name: '$userData.name',
          email: '$userData.email',
        },
      },
    ]);
    console.log('chefAllocationList', chefAllocationList);
    const chunchPayload = { customers: [] };
    await Promise.all(
      chefAllocationList.map(
        async (chefDetails: { name: any; email: any; chef_id: any }) => {
          // const today = await getBetweenDay(new Date());
          // const todayNotifyExist =
          //   await this.notificationHistoriesModel.findOne({
          //     customer_id: new mongoose.Types.ObjectId(chefDetails.chef_id),
          //     date: today,
          //     type_of_notification_master: 'partner_kitchen_draft_notification',
          //   });
          // if (!todayNotifyExist) {
          const payload = {
            channel: 'partner_kitchen_draft_notification',
            notificationPayload: {
              customer_id: chefDetails.chef_id,
              email: chefDetails.email,
              first_name: chefDetails.name,
              date: moment(
                new Date(
                  moment(date)
                    .utcOffset(0, true)
                    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                    .toISOString(),
                ),
              ).format('DD MMM YYYY'),
              end_date: moment(
                new Date(
                  moment(date)
                    .utcOffset(0, true)
                    .day(6) // Set to Saturday
                    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                    .toISOString(),
                ),
              ).format('DD MMM YYYY'),
              createdAt: new Date(),
            },
          };
          chunchPayload.customers.push(payload);
        },
        // },
      ),
    );
    console.log('chunchPayload', chunchPayload);
    // chunchPayload.customers = [
    //   {
    //     channel: 'partner_kitchen_draft_notification',
    //     notificationPayload: {
    //       customer_id: '67af2736c4ac2a42409cdcaf',
    //       email: 'naisargip@digiflux.io',
    //       first_name: 'naisargi',
    //       date: moment(
    //         new Date(
    //           moment(date)
    //             .utcOffset(0, true)
    //             .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    //             .toISOString(),
    //         ),
    //       ).format('DD MMM YYYY'),
    //       createdAt: new Date(),
    //       end_date: moment(
    //         new Date(
    //           moment(date)
    //             .utcOffset(0, true)
    //             .day(6) // Set to Saturday
    //             .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    //             .toISOString(),
    //         ),
    //       ).format('DD MMM YYYY'),
    //     },
    //   },
    // ];
    if (chunchPayload.customers.length > 0) {
      await this.notificationMasterService.sendNotificationMessageBatch(
        chunchPayload,
      );
    }
  }

  async chefAllocatedRecipeList(date: string, chef_id: string): Promise<any> {
    const chefAllocationList = await this.chefAllocationModel.find(
      {
        delivery_date: new Date(
          moment(date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toISOString(),
        ),
        chef_id: new mongoose.Types.ObjectId(chef_id),
        delivery_type: 'subscription',
      },
      {
        _id: 1,
        item: 1,
        recipe_id: 1,
        meal_type: 1,
        delivery_date: 1,
        chef: 1,
        chef_id: 1,
        is_finalized: 1,
        menu_allocation: 1,
      },
    );
    return chefAllocationList;
  }
}
