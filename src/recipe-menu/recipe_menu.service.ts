import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { RecipeMenuDocument } from './Schemas/recipe_menu.schema';
import mongoose, { Model } from 'mongoose';
import { CreateRecipeMenuDto } from './dto/create-recipe-menu.dto';
import { UpdateRecipeMenuDto } from './dto/update-recipe-menu.dto';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { getBetweenDay } from 'src/common/utils/utils';
import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import * as moment from 'moment-timezone';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import {
  mealRecipeCountDto,
  ProgressNotificationDto,
  RecipeMenuLiveDto,
} from './dto/recipe-menu-live.dto';
import { NotificationHistoryDocument } from 'src/notification_history/schemas/notification_history.schema';
import { HistoryService } from 'src/history/history.service';
import { message } from 'src/common/assets';
import { ParseObjectIdPipe } from 'src/common/utils/ParseObjectIdPipe';
// import { createObjectCsvStringifier } from 'csv-writer';
import * as ExcelJS from 'exceljs';
@Injectable()
export class RecipeMenuService {
  constructor(
    @InjectModel('Recipe_Menu')
    private readonly recipeMenuModel: Model<RecipeMenuDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('Dump_Recipes')
    private readonly dumpRecipesModel: Model<DumpRecipesDocument>,
    @InjectModel('Deliveries')
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Subscriptions')
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel('Customers')
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel('Notification_Histories')
    private readonly notificationHistoriesModel: Model<NotificationHistoryDocument>,
    private readonly notificationMasterService: NotificationMasterService,
    private readonly historyService: HistoryService,
  ) {}

  async createRecipeMenu(
    CreateRecipeMenuDto: CreateRecipeMenuDto,
  ): Promise<RecipeMenuDocument> {
    try {
      const recipe = CreateRecipeMenuDto.recipe.map((item) => ({
        ...item,
        recipe_id: new mongoose.Types.ObjectId(item.recipe_id),
      }));

      // Format dates to the specific format: 2024-12-14T00:00:00.000+00:00
      const formatDateToUTC = (dateString: string): Date => {
        // Parse the date and set time to 00:00:00.000 UTC
        const date = new Date(dateString);
        date.setUTCHours(0, 0, 0, 0);
        return date;
      };

      const newRole = new this.recipeMenuModel({
        ...CreateRecipeMenuDto,
        recipe: recipe,
        startDate: formatDateToUTC(CreateRecipeMenuDto.startDate),
        endDate: formatDateToUTC(CreateRecipeMenuDto.endDate),
      });
      return newRole.save();
    } catch (error) {
      console.log(error);
    }
  }

  async updateRecipeMenu(
    userId: string,
    id: string,
    updateRecipeMenuDto: UpdateRecipeMenuDto,
  ): Promise<RecipeMenuDocument> {
    const recipe = updateRecipeMenuDto.recipe.map((item) => ({
      ...item,
      recipe_id: new mongoose.Types.ObjectId(item.recipe_id),
    }));

    // Format dates to the specific format: 2024-12-14T00:00:00.000+00:00
    const formatDateToUTC = (dateString: string): Date => {
      // Parse the date and set time to 00:00:00.000 UTC
      const date = new Date(dateString);
      date.setUTCHours(0, 0, 0, 0);
      return date;
    };

    // Prepare update data with formatted dates
    const updateData: any = {
      ...updateRecipeMenuDto,
      recipe: recipe,
      startDate: formatDateToUTC(updateRecipeMenuDto.startDate),
      endDate: formatDateToUTC(updateRecipeMenuDto.endDate),
    };

    const UpdatedRecipeMenu = await this.recipeMenuModel.findByIdAndUpdate(
      id,
      updateData,
      { new: false },
    );
    updateRecipeMenuDto.recipe = updateRecipeMenuDto.recipe.map((item) => ({
      ...item,
      recipe_id: new ParseObjectIdPipe().transform(item.recipe_id, null),
    }));
    const { before_changes, current_changes } =
      await this.historyService.getChangedFields(
        UpdatedRecipeMenu,
        updateRecipeMenuDto,
      );
    await this.historyService.createHistory(
      userId,
      id,
      'RecipeMenu',
      message.history.HISTORY_UPDATE,
      before_changes,
      current_changes,
    );
    return;
  }

  async getRecipeMenu(id: string): Promise<any> {
    const data: any = await this.recipeMenuModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      // 1. Join with Recipe Details and Ratings
      {
        $lookup: {
          from: 'recipes_details',
          localField: 'recipe.recipe_id',
          foreignField: '_id',
          as: 'recipeDetails',
        },
      },
      {
        $lookup: {
          from: 'ratings',
          localField: 'recipe.recipe_id',
          foreignField: 'recipe_id',
          as: 'recipeRatings',
        },
      },
      // 2. Process all recipe fields efficiently
      {
        $addFields: {
          recipe: {
            $map: {
              input: '$recipe',
              as: 'rec',
              in: {
                $let: {
                  vars: {
                    // Find the matching detail object ONCE per recipe
                    detail: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$recipeDetails',
                            as: 'rd',
                            cond: { $eq: ['$$rd._id', '$$rec.recipe_id'] },
                          },
                        },
                        0,
                      ],
                    },
                    // Filter ratings for this recipe ONCE
                    thisRatings: {
                      $filter: {
                        input: '$recipeRatings',
                        as: 'rt',
                        cond: { $eq: ['$$rt.recipe_id', '$$rec.recipe_id'] },
                      },
                    },
                  },
                  in: {
                    $mergeObjects: [
                      '$$rec',
                      {
                        dish_name: '$$detail.dish_name',
                        meal_category: '$$detail.meal_category',
                        category_type: '$$detail.category_type',
                        protein_category: {
                          $map: {
                            input: {
                              $ifNull: ['$$detail.protein_category', []],
                            },
                            as: 'pc',
                            in: '$$pc.category',
                          },
                        },
                        dish_type: '$$detail.dish_type',
                        cuisine: '$$detail.cuisine',
                        composition: '$$detail.composition',
                        price: '$$detail.price',
                        // Calculation logic for ratings
                        latest_delivery_date: {
                          $max: '$$thisRatings.delivery_date',
                        },
                        latest_week_rating: {
                          $let: {
                            vars: {
                              latestDate: {
                                $max: '$$thisRatings.delivery_date',
                              },
                            },
                            in: {
                              $avg: {
                                $map: {
                                  input: {
                                    $filter: {
                                      input: '$$thisRatings',
                                      as: 'rt',
                                      cond: {
                                        $and: [
                                          {
                                            $gte: [
                                              '$$rt.delivery_date',
                                              {
                                                $dateSubtract: {
                                                  startDate: '$$latestDate',
                                                  unit: 'day',
                                                  amount: {
                                                    $subtract: [
                                                      {
                                                        $dayOfWeek:
                                                          '$$latestDate',
                                                      },
                                                      2,
                                                    ],
                                                  },
                                                },
                                              },
                                            ],
                                          },
                                          {
                                            $lte: [
                                              '$$rt.delivery_date',
                                              {
                                                $dateAdd: {
                                                  startDate: '$$latestDate',
                                                  unit: 'day',
                                                  amount: {
                                                    $subtract: [
                                                      8,
                                                      {
                                                        $dayOfWeek:
                                                          '$$latestDate',
                                                      },
                                                    ],
                                                  },
                                                },
                                              },
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                  as: 'fr',
                                  in: '$$fr.rating',
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          recipeDetails: 0,
          recipeRatings: 0,
        },
      },
    ]);

    return data?.[0] || null;
  }

  async duplicateRecipeMenu(id: string): Promise<any> {
    console.log('id in recipe', id);
    const originalOrder: any = await this.recipeMenuModel
      .findById(new mongoose.Types.ObjectId(id))
      .lean();

    if (!originalOrder) {
      throw new NotFoundException('Order not found');
    }

    // Extract name and remove unique fields
    const { _id, createdAt, updatedAt, name, ...orderData } = originalOrder;

    // Extract base name (remove "Copy X" if it exists)
    // const baseName = name.replace(/ Copy \d+$/, '');

    // // Find the highest existing copy number for this base document
    // const lastCopy = await this.recipeMenuModel
    //   .find({ name: new RegExp(`^${baseName} Copy \\d+$`, 'i') })
    //   .sort({ name: -1 }) // Sort in descending order to get highest number
    //   .limit(1)
    //   .lean();

    // // Determine the next copy number
    // let nextCopyNumber = 1;
    // if (lastCopy.length > 0) {
    //   const match = lastCopy[0].name.match(/Copy (\d+)$/);
    //   if (match) {
    //     nextCopyNumber = parseInt(match[1]) + 1;
    //   }
    // }

    // Generate new name
    const newName = name + ' Copy';

    // Create new document with updated name
    const duplicatedOrder = new this.recipeMenuModel({
      ...orderData,
      name: newName,
    });

    try {
      return await duplicatedOrder.save();
    } catch (error) {
      throw new InternalServerErrorException('Failed to duplicate order');
    }
  }

  async getAllRecipeMenu(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    try {
      const skip = (page - 1) * limit;

      // Create search filter (if search term is provided)
      let filters = {};
      if (search) {
        filters = { name: { $regex: search, $options: 'i' } }; // Case-insensitive search by recipe name
      }

      // Retrieve paginated and filtered recipes
      const data = await this.recipeMenuModel
        .find(filters)
        .select('name')
        .sort({ name: 1 })
        .skip(+skip)
        .limit(+limit)
        .exec();
      const total = await this.recipeMenuModel.countDocuments(filters).exec();

      return {
        list: data,
        count: total,
        currentPage: +page,
        totalPages: Math.ceil(total / limit) || 0,
      };
    } catch (error) {
      throw new Error('Failed to retrieve recipe menus');
    }
  }

  async getRecipeMenuDelete(id: string): Promise<void> {
    await this.recipeMenuModel
      .deleteOne({ _id: new mongoose.Types.ObjectId(id) })
      .exec();
  }
  async recipeMenuLive(dates: string[], menu_id: string): Promise<any> {
    if (menu_id == '' || menu_id == undefined || menu_id == null) {
      throw new HttpException(
        {
          message: message.recipe_menu.RECIPE_DUMP_MENU,
          status: false,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const menuRecipeCount = { Meal: 0, Breakfast: 0, Snack: 0 };
    const menuRecipes = await this.recipeMenuModel
      .findOne({ _id: new mongoose.Types.ObjectId(menu_id) })
      .exec();
    const recipesDetails = [];
    if (menuRecipes?.recipe.length > 0) {
      for (const menuRecipe of menuRecipes?.recipe) {
        let recipeFindType = menuRecipe?.type?.flatMap(
          (typ: { protein_option: string[] }) =>
            typ.protein_option.map((option) => 'Protein - ' + option),
        );

        const proteinTypeData = menuRecipe?.type?.flatMap(
          (typ: { protein_option: string[] }) => typ.protein_option,
        );

        // Convert to a unique set and back to an array
        const proteinType = [...new Set(proteinTypeData)];

        // Extract protein categories from menu recipe types (dynamic instead of hardcoded)
        const proteinCategoryData = menuRecipe?.type?.flatMap(
          (typ: { protein_category: string }) => typ.protein_category,
        );

        // Convert to a unique set and back to an array, with fallback to default categories
        const proteinCategory =
          proteinCategoryData?.length > 0
            ? [...new Set(proteinCategoryData)]
            : ['balance', 'low', 'high', 'vegetarian'];
        if (recipeFindType.length === 0) {
          recipeFindType = ['Standard'];
        }
        const recipeId = new mongoose.Types.ObjectId(menuRecipe?.recipe_id);

        //have to correct this recipeIngrData
        const totalProteinComp = await this.recipeModel.aggregate([
          {
            $match: {
              _id: recipeId,
            },
          },
          {
            $unwind: '$composition',
          },
          {
            $group: {
              _id: null,
              types: { $addToSet: '$composition.type' },
              meal_category: { $first: '$meal_category' },
            },
          },
          {
            $project: {
              _id: 0,
              types: 1,
              meal_category: 1,
            },
          },
        ]);

        const finalTotalProtein = [];
        totalProteinComp?.map((protein: any) => {
          if (protein?.meal_category) {
            menuRecipeCount[`${protein?.meal_category}`] += 1;
          }
          protein?.types?.map((itm: any) => {
            if (itm?.startsWith('Protein -')) {
              finalTotalProtein?.push(itm);
            }
          });
        });
        const notIncludedProtein = getUncommonElements(
          finalTotalProtein,
          recipeFindType,
        );

        const recipeIngrData = await this.recipeModel.aggregate([
          {
            $match: {
              _id: recipeId,
            },
          },
          {
            $unwind: {
              path: '$composition',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              'composition.type': {
                $not: {
                  $regex: 'Protein',
                  $options: 'i',
                },
              },
            },
          },
          {
            $unwind: {
              path: '$composition.protein_category',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              componentId: '$composition.component_id',
              ingredientId: '$composition.ingredient_id',
              protein_category: '$composition.protein_category',
            },
          },
          {
            $graphLookup: {
              from: 'components',
              startWith: '$componentId',
              connectFromField: 'composition.component_id',
              connectToField: '_id',
              as: 'subRecipes',
              maxDepth: 10,
              depthField: 'depth',
            },
          },
          {
            $unwind: {
              path: '$subRecipes',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $unwind: {
              path: '$subRecipes.composition',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              componentId: '$subRecipes._id',
              ingredientId: '$subRecipes.composition.ingredient_id',
              protein_category: 1,
            },
          },
          {
            $group: {
              _id: null,
              ingredientIds: {
                $addToSet: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $ne: ['$ingredientId', null],
                        },
                        {
                          $ne: ['$ingredientId', ''],
                        },
                      ],
                    },
                    then: {
                      _id: '$ingredientId',
                      protein_category: '$protein_category',
                    },
                    else: null,
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              ingredientIds: 1,
            },
          },
          {
            $unwind: {
              path: '$ingredientIds',
            },
          },
          {
            $lookup: {
              from: 'ingredients',
              localField: 'ingredientIds._id',
              foreignField: '_id',
              as: 'ingredientDetails',
              pipeline: [
                {
                  $match: {
                    show_customers: true,
                  },
                },
                {
                  $project: {
                    name_of_customers: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              ingredientId: '$ingredientIds._id',
              protein_category: '$ingredientIds.protein_category',
              ingredientDetails: {
                $arrayElemAt: ['$ingredientDetails.name_of_customers', 0],
              },
            },
          },
          {
            $group: {
              _id: '$protein_category',
              ingredients: {
                $push: {
                  $cond: {
                    if: { $ne: ['$ingredientDetails', null] },
                    then: '$ingredientDetails',
                    else: '$$REMOVE',
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              protein_category: '$_id',
              ingredients: 1,
            },
          },
        ]);

        const recipeVariantIngrData = await this.recipeModel.aggregate([
          {
            $match: {
              _id: recipeId,
            },
          },
          {
            $unwind: {
              path: '$composition',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'components',
              localField: 'composition.component_id',
              foreignField: '_id',
              as: 'componentData',
              pipeline: [
                {
                  $addFields: {
                    allergensId: {
                      $map: {
                        input: '$allergens',
                        as: 'strId',
                        in: { $toObjectId: '$$strId' },
                      },
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'allergens',
                    localField: 'allergensId',
                    foreignField: '_id',
                    as: 'allergensData',
                  },
                },
                {
                  $addFields: {
                    allergensName: {
                      $map: {
                        input: '$allergensData',
                        as: 'allerItm',
                        in: '$$allerItm.name',
                      },
                    },
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: '$composition.portioning_balance',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $match: {
              'composition.portioning_balance.protein_category': {
                $in: proteinCategory,
              },
            },
          },
          {
            $group: {
              _id: {
                protein_type: '$composition.portioning_balance.protein_type',
                type: '$composition.portioning_balance.type',
                protein_category:
                  '$composition.portioning_balance.protein_category',
              },
              kcal: {
                $sum: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $eq: ['$composition.portioning_balance.kcal', NaN],
                        },
                        {
                          $eq: ['$composition.portioning_balance.kcal', null],
                        },
                      ],
                    },
                    then: 0,
                    else: '$composition.portioning_balance.kcal',
                  },
                },
              },
              fat: {
                $sum: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $eq: ['$composition.portioning_balance.fat', NaN],
                        },
                        {
                          $eq: ['$composition.portioning_balance.fat', null],
                        },
                      ],
                    },
                    then: 0,
                    else: '$composition.portioning_balance.fat',
                  },
                },
              },
              carb: {
                $sum: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $eq: ['$composition.portioning_balance.carb', NaN],
                        },
                        {
                          $eq: ['$composition.portioning_balance.carb', null],
                        },
                      ],
                    },
                    then: 0,
                    else: '$composition.portioning_balance.carb',
                  },
                },
              },
              protein: {
                $sum: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $eq: ['$composition.portioning_balance.protein', NaN],
                        },
                        {
                          $eq: [
                            '$composition.portioning_balance.protein',
                            null,
                          ],
                        },
                      ],
                    },
                    then: 0,
                    else: '$composition.portioning_balance.protein',
                  },
                },
              },
              net_qty: {
                $sum: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $eq: ['$composition.portioning_balance.net_qty', NaN],
                        },
                        {
                          $eq: [
                            '$composition.portioning_balance.net_qty',
                            null,
                          ],
                        },
                      ],
                    },
                    then: 0,
                    else: '$composition.portioning_balance.net_qty',
                  },
                },
              },
              component: {
                $push: {
                  $cond: {
                    if: {
                      $or: [
                        {
                          $eq: ['$composition.component_id', NaN],
                        },
                        {
                          $eq: ['$composition.component_id', null],
                        },
                      ],
                    },
                    then: 0,
                    else: {
                      component_id: '$composition.component_id',
                      type: '$composition.type',
                    },
                  },
                },
              },
              components: {
                $push: {
                  name: {
                    $arrayElemAt: ['$componentData.name', 0],
                  },
                  allergens: {
                    $arrayElemAt: ['$componentData.allergensName', 0],
                  },
                  kcal: '$composition.portioning_balance.kcal',
                  fat: '$composition.portioning_balance.fat',
                  carb: '$composition.portioning_balance.carb',
                  protein: '$composition.portioning_balance.protein',
                  price: '$composition.portioning_balance.price',
                  net_qty: '$composition.portioning_balance.net_qty',
                  protein_category:
                    '$composition.portioning_balance.protein_category',
                  component_id: {
                    $arrayElemAt: ['$componentData._id', 0],
                  },
                  // packaging_material: '$composition.packaging_material',
                  packaging_material:
                    '$composition.portioning_balance.packaging_material',
                  material: '$composition.portioning_balance.material',
                  description: '$composition.portioning_balance.description',
                  instruction: '$composition.portioning_balance.instruction',
                  is_main: '$composition.portioning_balance.is_main',
                  is_inside: '$composition.portioning_balance.is_inside',
                  is_separate: '$composition.portioning_balance.is_separate',
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              protein_option: '$_id.protein_type',
              size: '$_id.type',
              protein_category: '$_id.protein_category',
              kcal: {
                $floor: '$kcal',
              },
              fat: {
                $floor: '$fat',
              },
              carb: {
                $floor: '$carb',
              },
              protein: {
                $floor: '$protein',
              },
              net_qty: {
                $floor: '$net_qty',
              },
              component: 1,
              components: 1,
            },
          },
          {
            $match: {
              protein_option: {
                $in: proteinType,
              },
            },
          },
          {
            $facet: {
              componentMatch: [
                {
                  $unwind: {
                    path: '$component',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $match: {
                    'component.type': {
                      $regex: 'Protein',
                      $options: 'i',
                    },
                  },
                },
                {
                  $graphLookup: {
                    from: 'components',
                    startWith: '$component.component_id',
                    connectFromField: 'composition.component_id',
                    connectToField: '_id',
                    as: 'subRecipes',
                    maxDepth: 10,
                    depthField: 'depth',
                  },
                },
                {
                  $addFields: {
                    allComponents: {
                      $concatArrays: [['$$ROOT'], '$subRecipes'],
                    },
                  },
                },
                {
                  $unwind: {
                    path: '$allComponents',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $unwind: {
                    path: '$allComponents.composition',
                    preserveNullAndEmptyArrays: true,
                  },
                },
                {
                  $group: {
                    _id: {
                      protein_option: '$protein_option',
                      size: '$size',
                      protein_category: '$protein_category',
                    },
                    kcal: {
                      $first: '$kcal',
                    },
                    fat: {
                      $first: '$fat',
                    },
                    carb: {
                      $first: '$carb',
                    },
                    protein: {
                      $first: '$protein',
                    },
                    net_qty: {
                      $first: '$net_qty',
                    },
                    components: {
                      $first: '$components',
                    },
                    ingredientIds: {
                      $addToSet: '$allComponents.composition.ingredient_id',
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    protein_option: '$_id.protein_option',
                    size: '$_id.size',
                    protein_category: '$_id.protein_category',
                    kcal: {
                      $round: ['$kcal', 2],
                    },
                    fat: {
                      $round: ['$fat', 2],
                    },
                    carb: {
                      $round: ['$carb', 2],
                    },
                    protein: {
                      $round: ['$protein', 2],
                    },
                    net_qty: {
                      $round: ['$net_qty', 2],
                    },
                    components: 1,
                    ingredientIds: {
                      $filter: {
                        input: '$ingredientIds',
                        as: 'ingredientId',
                        cond: {
                          $ne: ['$$ingredientId', null],
                        },
                      },
                    },
                  },
                },
                {
                  $lookup: {
                    from: 'ingredients',
                    localField: 'ingredientIds',
                    foreignField: '_id',
                    as: 'ingredientDetails',
                    pipeline: [
                      {
                        $match: {
                          show_customers: true,
                        },
                      },
                      {
                        $project: {
                          name_of_customers: 1,
                        },
                      },
                    ],
                  },
                },
                {
                  $project: {
                    _id: 0,
                    protein_option: 1,
                    size: 1,
                    kcal: 1,
                    fat: 1,
                    carb: 1,
                    protein: 1,
                    net_qty: 1,
                    components: 1,
                    portioning_balance: 1,
                    protein_category: 1,
                    variant_ingredients: {
                      $map: {
                        input: '$ingredientDetails',
                        as: 'ingredient',
                        in: '$$ingredient.name_of_customers',
                      },
                    },
                  },
                },
              ],
              defaultCase: [
                {
                  $group: {
                    _id: {
                      protein_option: '$protein_option',
                      size: '$size',
                      protein_category: '$protein_category',
                    },
                    kcal: {
                      $first: '$kcal',
                    },
                    fat: {
                      $first: '$fat',
                    },
                    carb: {
                      $first: '$carb',
                    },
                    protein: {
                      $first: '$protein',
                    },
                    components: {
                      $first: '$components',
                    },
                    ingredientIds: {
                      $addToSet: null,
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    protein_option: '$_id.protein_option',
                    size: '$_id.size',
                    protein_category: '$_id.protein_category',
                    kcal: {
                      $round: ['$kcal', 2],
                    },
                    fat: {
                      $round: ['$fat', 2],
                    },
                    carb: {
                      $round: ['$carb', 2],
                    },
                    protein: {
                      $round: ['$protein', 2],
                    },
                    components: 1,
                    variant_ingredients: {
                      $literal: [],
                    },
                  },
                },
              ],
            },
          },
          {
            $project: {
              result: {
                $cond: {
                  if: {
                    $gt: [
                      {
                        $size: '$componentMatch',
                      },
                      0,
                    ],
                  },
                  then: '$componentMatch',
                  else: '$defaultCase',
                },
              },
            },
          },
          {
            $unwind: '$result',
          },
          {
            $replaceRoot: {
              newRoot: '$result',
            },
          },
          {
            $match: {
              net_qty: {
                $ne: 0,
              },
            },
          },
        ]);

        // Fetch recipe name for error messages
        const recipeNameData = await this.recipeModel
          .findOne({ _id: recipeId }, { dish_name: 1 })
          .exec();

        let recipevariant = [];

        menuRecipe?.type?.forEach(
          (typ: { protein_option: string[]; protein_category: string }) => {
            const filteredItems = recipeVariantIngrData.filter(
              (item) =>
                item.protein_category === typ.protein_category &&
                typ.protein_option.includes(item.protein_option),
            );

            const tempFilterItems = filteredItems?.map((itm) => {
              const allergensData = [];
              // Use a Map for O(1) lookup. Key is the String representation of the BSON ID.
              const packagingMaterialMap = new Map();

              // Process components if they exist
              if (itm?.components && Array.isArray(itm.components)) {
                itm.components.forEach((compItm) => {
                  // A. Collect All Allergens
                  if (compItm?.allergens && Array.isArray(compItm.allergens)) {
                    compItm.allergens.forEach((allerItm) => {
                      allergensData.push(allerItm);
                    });
                  }

                  const packId = compItm?.packaging_material?.toString(); // Get string key

                  // Ensure packId is valid before proceeding with aggregation
                  if (!packId) return;

                  // B. Consolidate Packaging Materials
                  if (packagingMaterialMap.has(packId)) {
                    // Exists: Merge Allergens
                    const existingPack = packagingMaterialMap.get(packId);
                    existingPack.allergens = [
                      ...new Set([
                        ...existingPack.allergens,
                        ...(compItm?.allergens || []),
                      ]),
                    ];
                  } else {
                    // New: Add to Map
                    packagingMaterialMap.set(packId, {
                      packaging_material: compItm?.packaging_material,
                      material: compItm?.material,
                      description: compItm?.description,
                      instruction: compItm?.instruction,
                      allergens: [...new Set(compItm?.allergens || [])],
                      is_main: compItm?.is_main,
                      is_inside: compItm?.is_inside,
                      is_separate: compItm?.is_separate,
                    });
                  }
                });
              }

              // Validate packaging material - at least one should be present
              if (packagingMaterialMap.size === 0) {
                throw new HttpException(
                  {
                    message:
                      message.recipe_menu
                        .RECIPE_DUMP_MISSING_PACKAGING_MATERIAL +
                      ` Recipe: ${recipeNameData?.dish_name || 'Unknown'}, Variant: ${itm?.protein_option || 'Unknown'} (${itm?.size || 'Unknown'} - ${itm?.protein_category || 'Unknown'})`,
                    status: false,
                    data: null,
                  },
                  HttpStatus.BAD_REQUEST,
                );
              }

              return {
                ...itm,
                // Convert Map values back to an array for the final output
                packaging_material: Array.from(packagingMaterialMap.values()),
                allergens: [...new Set(allergensData)], // Final deduplication
              };
            });
            recipevariant = recipevariant.concat(tempFilterItems);
          },
        );
        const proteinData = await this.recipeModel
          .aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(recipeId) } },
            { $unwind: '$composition' },
            { $unwind: '$composition.portioning_balance' },
            {
              $match: {
                'composition.portioning_balance.protein_type': {
                  $in: menuRecipe?.type,
                },
                'composition.portioning_balance.protein_category': {
                  $in: proteinCategory,
                },
              },
            },
            {
              $group: {
                _id: null,
                uniqueProteinTypes: {
                  $addToSet: '$composition.portioning_balance.protein_type',
                },
              },
            },
            { $project: { _id: 0, uniqueProteinTypes: 1 } },
          ])
          .exec();

        const recipeData = await this.recipeModel
          .findOne({ _id: new mongoose.Types.ObjectId(recipeId) })
          .populate('cuisine')
          .populate('dish_type')
          .populate('allergens')
          .populate('diet_type')
          .exec();
        const variantData = [];
        recipeVariantIngrData?.map((variant) => {
          const variantIndex = variantData?.findIndex(
            (vrntItm) => vrntItm == variant?.protein_option,
          );
          if (variantIndex == -1) {
            variantData?.push(variant?.protein_option);
          }
        });
        // console.log('variantData', variantData);
        // if (recipeData) {
        //   menuFinalPayload?.recipe.push({
        //     recipe_id: recipeData?._id,
        //     type: variantData,
        //     protein_category: recipeData?.protein_category || [
        //       'balance',
        //       'low',
        //       'high',
        //     ],
        //   });
        // }

        if (recipeVariantIngrData?.length == 0 && recipeData) {
          throw new HttpException(
            {
              message:
                message.recipe_menu.RECIPE_DUMP_INSUFFICIENT_VARIANT +
                ' ' +
                recipeData?.dish_name,
              status: false,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        function hasNameProperty(item: any): item is { name: string } {
          return typeof item === 'object' && item !== null && 'name' in item;
        }
        const compositionData = [];
        const packagingMaterialData = [];
        recipeData?.composition?.map((comp: any) => {
          let singleComposition = {};
          if (notIncludedProtein?.findIndex((itm) => itm == comp?.type) == -1) {
            // compositionData?.push(comp);
            const tempPortioning = [];
            singleComposition = comp;
            const tempProteinCategory = comp.protein_category;
            comp.protein_category = proteinCategory;
            if (
              packagingMaterialData?.findIndex(
                (material) =>
                  material?._id?.toString() ==
                  comp?.packaging_material?.toString(),
              ) == -1
            ) {
              packagingMaterialData?.push({
                _id: comp?.packaging_material,
                material: comp?.material || '',
                description: comp?.description || '',
                instruction: comp?.instruction || '',
                is_main: comp?.is_main || false,
                protein_category: tempProteinCategory,
              });
            }
            comp?.portioning_balance?.map((portItm) => {
              if (
                proteinType?.findIndex(
                  (menuItm) => menuItm == portItm?.protein_type,
                ) != -1 &&
                proteinCategory.includes(portItm?.protein_category)
              ) {
                tempPortioning?.push(portItm);
              }
            });
            singleComposition = {
              ...singleComposition,
              portioning_balance: tempPortioning,
            };
            compositionData?.push(singleComposition);
          }
        });
        const dishType =
          recipeData?.dish_type?.map((item) => {
            if (hasNameProperty(item)) {
              return item.name;
            }
            return '';
          }) || [];
        const cuisine =
          recipeData?.cuisine && hasNameProperty(recipeData.cuisine)
            ? recipeData.cuisine.name
            : '';

        function extractNestedValues(recipeData) {
          if (Array.isArray(recipeData?.diet_type)) {
            const nestedValues = recipeData.diet_type.map((dietItem) => {
              if (Array.isArray(dietItem.value)) {
                return dietItem.value.map((nested) => nested.value);
              } else if (dietItem.value && typeof dietItem.value === 'object') {
                return [dietItem.value.value];
              }
              return [];
            });
            return nestedValues.flat();
          }
          return [];
        }
        // Find the index of the item where "is_main" is true
        const mainIndex = packagingMaterialData.findIndex(
          (item) => item.is_main === true,
        );

        // If such an item is found, move it to the first position
        if (mainIndex > -1) {
          packagingMaterialData.unshift(
            packagingMaterialData.splice(mainIndex, 1)[0],
          );
        }

        const nestedValues = extractNestedValues(recipeData);

        const payload = {
          _id: new mongoose.Types.ObjectId(recipeData?._id),
          recipe_id: new mongoose.Types.ObjectId(recipeData?._id),
          meal_category: recipeData?.meal_category || '',
          label_instruction: recipeData?.label_instruction || '',
          plating_instruction: recipeData?.plating_instruction || '',
          dish_name: recipeData?.dish_name || '',
          category_type: recipeData?.category_type || '',
          price: recipeData?.price || [],
          cuisine: cuisine,
          dish_type: dishType,
          description: recipeData?.description || '',
          ingredients: recipeIngrData || [],
          allergens_contain:
            recipeData?.allergens?.map((itm: any) => itm?.name) || [],
          allergens_free_from: nestedValues || [],
          protein_category: proteinCategory,
          protein_category_info: recipeData?.protein_category,
          packaging_material:
            packagingMaterialData?.length > 1 ? packagingMaterialData : [],
          packaging_material_original: packagingMaterialData,
          website_image: recipeData?.final_dish_image || [],
          // variants: proteinData?.[0]?.uniqueProteinTypes || [],
          other_variants: proteinData?.[0]?.uniqueProteinTypes || [],
          protein_size: recipeData?.protein_size || '',
          spice_level: recipeData?.spice_level || '',
          cooking_complexity: recipeData?.cooking_complexity || '',
          plating_complexity: recipeData?.plating_complexity || '',
          highly_perishable: recipeData?.highly_perishable || false,
          recommendation: recipeData?.recommendation || [],
          phase: recipeData?.phase || null,
          composition: compositionData,
          variants: recipevariant,
        };

        // Example usage: log the final data
        recipesDetails.push(payload);
      }
    }
    // console.log('recipesDetails', recipesDetails);
    //have to change it to 3 B 3 M 3 S
    if (
      menuRecipeCount.Breakfast < 3 ||
      menuRecipeCount.Snack < 3 ||
      menuRecipeCount.Meal < 3
    ) {
      throw new HttpException(
        {
          message: message.recipe_menu.RECIPE_DUMP_INSUFFICIENT_MENU,
          status: false,
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const single_date of dates) {
      const formattedDate = new Date(
        moment(single_date)
          .utcOffset(0, true)
          .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
          .toDate(),
      );

      const date = await getBetweenDay(formattedDate);
      const checkrecipes = await this.dumpRecipesModel.findOne({ date: date });
      const finalPayload = {
        date: formattedDate,
        recipes: recipesDetails,
        menu_id: new mongoose.Types.ObjectId(menu_id),
        dump_recipe_flag: true,
        all_steps_done: false,
        auto_selection_flag: false,
        notification_flag: false,
        auto_selection_progress_flag: false,
        live_on_frontend_flag: false,
        notification_progress_flag: false,
      };
      if (checkrecipes) {
        await this.dumpRecipesModel.updateOne({ date: date }, finalPayload, {
          new: true,
        });
      } else {
        await this.dumpRecipesModel.create(finalPayload);
      }
    }
    // await this.recipeMenuModel.findByIdAndUpdate(
    //   new mongoose.Types.ObjectId(menu_id),
    //   { $set: { recipe: menuFinalPayload?.recipe } },
    // );
    return {
      message: message.recipe_menu.RECIPE_DUMP,
      data: [],
      status: true,
    };
  }
  async recipeMenuAutoSelection(
    dates: string[],
    re_run: boolean,
  ): Promise<void> {
    if (re_run) {
      //////////////////////Firstly Menu Live for All customers//////////////////////////
      await this.deliveryModel
        .updateMany(
          {
            delivery_date: {
              $gte: new Date(
                moment(dates[0])
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(dates[dates.length - 1])
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
            delivery_type: 'subscription',
            // is_processed: { $ne: true },
          },
          { $set: { is_processed: false } },
        )
        .exec();
    }

    // Aggregate customer data for all dates in the range
    const combinedCustomerData =
      await this.aggregateCustomerDataForRange(dates);

    // Chunk the combined customer data
    const customerChunks = this.sliceIntoChunks(
      combinedCustomerData.total_customer,
      Number(process.env.CUSTOMER_CHUNK_SIZE),
    );

    const finalDates = [];

    dates?.map((dateitm) => {
      finalDates?.push(
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
      );
    });
    finalDates.sort((a, b) => a - b);
    await this.dumpRecipesModel.updateMany(
      { date: { $in: finalDates } },
      { $set: { auto_selection_progress_flag: true } },
    );
    // Process each chunk of customers
    const chunkPromises = customerChunks.map((chunk, index) =>
      this.processCustomerChunk(
        chunk,
        dates, // Pass the entire date range
        combinedCustomerData,
        index,
        customerChunks.length,
      ),
    );
    await Promise.all(chunkPromises);
  }

  private async aggregateCustomerDataForRange(dates: string[]) {
    let allCustomerData: any[] = [];
    let totalDelivery = 0;

    for (const single_date of dates) {
      const customerDataForDate =
        await this.getUniqueCustomerforSelectedPeriod(single_date);
      allCustomerData = [
        ...allCustomerData,
        ...customerDataForDate.total_customer,
      ];
      totalDelivery += customerDataForDate.total_delivery;
    }

    // Deduplicate customers across all days
    const uniqueCustomersMap = new Map();
    allCustomerData.forEach((customer) => {
      uniqueCustomersMap.set(customer.customer, customer);
    });

    const uniqueCustomers = Array.from(uniqueCustomersMap.values());

    return { total_customer: uniqueCustomers, total_delivery: totalDelivery };
  }

  private async getUniqueCustomerforSelectedPeriod(single_date: string) {
    const date = await getBetweenDay(single_date);
    const deliveryData = await this.deliveryModel
      .find(
        {
          delivery_date: date,
          not_deliverable: false,
          is_delivery_freezed: false,
          delivery_type: 'subscription',
          status: 'Pending',
        },
        { customer_id: 1, order_id: 1, subscription_id: 1 },
      )
      .exec();
    const uniqueWithoutWarningCustomer = new Set();
    const uniqueWarningCustomer = new Set();
    const finalCustomers = [];
    const totalDelivery = deliveryData.length;

    // Fetch subscription data for all customers in one go
    const subscriptionIds = deliveryData.map(
      (delivery) => delivery.subscription_id,
    );
    const subscriptions = await this.subscriptionModel
      .find({ _id: { $in: subscriptionIds } }, { avoid_ingredients: 1 })
      .exec();
    const subscriptionMap = new Map(
      subscriptions.map((sub) => [sub._id.toString(), sub]),
    );

    for (const customer of deliveryData) {
      const subscription = subscriptionMap.get(
        customer.subscription_id.toString(),
      );
      const avoidIngredients = subscription?.avoid_ingredients || [];

      const customerStr = customer.customer_id.toString();
      if (avoidIngredients.length === 0) {
        if (!uniqueWithoutWarningCustomer.has(customerStr)) {
          finalCustomers.push({
            customer: customerStr,
            type: 'withoutWarning',
            order_id: customer.order_id,
          });
          uniqueWithoutWarningCustomer.add(customerStr);
        }
      } else {
        if (!uniqueWarningCustomer.has(customerStr)) {
          finalCustomers.push({
            customer: customerStr,
            type: 'withWarning',
            order_id: customer.order_id,
          });
          uniqueWarningCustomer.add(customerStr);
        }
      }
    }

    return { total_customer: finalCustomers, total_delivery: totalDelivery };
  }

  private async processCustomerChunk(
    chunk: any[],
    dates: string[], // Pass the entire date range
    customerData: any,
    chunkIndex: number,
    totalChunks: number,
  ) {
    const payload = {
      type: 'manual',
      customer: chunk,
      week: dates, // Use the range of dates
      totalCustomer: customerData.total_customer.length,
      totalDelivery: customerData.total_delivery,
    };

    // Optionally set 'count' property if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      payload['count'] = 'max';
    }
    // Send the payload for processing (e.g., to a message queue)

    await this.notificationMasterService.sendMessageLambda(payload);
  }

  private sliceIntoChunks(arr: any[], chunkSize: number) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      res.push(arr.slice(i, i + chunkSize));
    }
    return res;
  }

  async recipeMenuLiveAndNotificationSend(dates: string[]): Promise<void> {
    //////////////////////Firstly Menu Live for All customers//////////////////////////
    await this.deliveryModel
      .updateMany(
        {
          delivery_date: {
            $gte: new Date(
              moment(dates[0])
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
            $lte: new Date(
              moment(dates[dates.length - 1])
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
          },
          delivery_type: 'subscription',
          menu_live: { $ne: true },
        },
        { $set: { menu_live: true } },
      )
      .exec();

    const finalDates = [];

    dates?.map((dateitm) => {
      finalDates?.push(
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
      );
    });
    finalDates.sort((a, b) => a - b);

    await this.dumpRecipesModel.updateMany(
      { date: { $in: finalDates } },
      { $set: { live_on_frontend_flag: true } },
    );

    //////////////////////Send ALL Week customers Notifications //////////////////
    const combinedCustomerData =
      await this.aggregateCustomerDataForRange(dates);
    // Chunk the combined customer data
    const customerChunks = this.sliceIntoChunks(
      combinedCustomerData.total_customer,
      Number(process.env.CUSTOMER_NOTIFICATION_CHUNK_SIZE),
    );

    // Process each chunk of customers

    await this.dumpRecipesModel.updateMany(
      { date: { $in: finalDates } },
      { notification_progress_flag: true },
    );

    // const chunkPromises = customerChunks.map((chunk, index) =>
    //   this.processCustomerNotificationChunk(
    //     chunk,
    //     dates, // Pass the entire date range
    //     combinedCustomerData,
    //     index,
    //     customerChunks.length,
    //   ),
    // );
    // await Promise.all(chunkPromises);

    for (let index = 0; index < customerChunks.length; index++) {
      const chunk = customerChunks[index];
      await this.processCustomerNotificationChunk(
        chunk,
        dates,
        combinedCustomerData,
        index,
        customerChunks.length,
      );
    }
  }
  private async processCustomerNotificationChunk(
    chunk: any[],
    dates: string[], // Pass the entire date range
    customerData: any,
    chunkIndex: number,
    totalChunks: number,
  ) {
    const chunchPayload = {
      customers: [],
      totalCustomer: customerData.total_customer.length,
      totalDelivery: customerData.total_delivery,
    };
    await Promise.all(
      chunk.map(async (singleCustomer: { customer: any; order_id: any }) => {
        const customerDetails = await this.customerModel.findOne({
          _id: singleCustomer.customer,
        });
        const today = await getBetweenDay(new Date());
        const todayNotifyExist = await this.notificationHistoriesModel.findOne({
          customer_id: new mongoose.Types.ObjectId(singleCustomer.customer),
          date: today,
          type_of_notification_master: 'menu_weekly_notification',
        });
        if (!todayNotifyExist) {
          const payload = {
            channel: 'menu_weekly_notification',
            notificationPayload: {
              customer_id: singleCustomer.customer,
              order_id: singleCustomer.order_id,
              email: customerDetails.email,
              country_code: customerDetails.whatsapp_country_code,
              phone_number: customerDetails.whatsapp_number,
              first_name: customerDetails.first_name,
              date: moment(dates[0]).format('YYYY-MM-DD'),
              all_dates: (dates || [])?.map((date) =>
                moment(date).format('DD/MM'),
              ),
              createdAt: new Date(),
            },
          };
          console.log('check check payload', payload);
          chunchPayload.customers.push(payload);
        }
      }),
    );

    // Optionally set 'count' property if this is the last chunk
    if (chunkIndex === totalChunks - 1) {
      chunchPayload['count'] = 'max';
    }
    // Send the payload for processing (e.g., to a message queue)

    if (chunchPayload.customers.length) {
      await this.notificationMasterService.sendNotificationMessageBatch(
        chunchPayload,
      );
    }
  }

  async getMealPlanRecipeCount(mealPlanDto: mealRecipeCountDto): Promise<any> {
    const startDate = moment(mealPlanDto?.startDate)
      .startOf('day')
      .utcOffset(240)
      .toDate();
    const endDate = moment(mealPlanDto?.endDate)
      .endOf('day')
      .utcOffset(240)
      .toDate();

    // Aggregation for delivery data
    const deliveryData = await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_date: { $gte: startDate, $lte: endDate },
          not_deliverable: false,
          is_delivery_freezed: false,
          delivery_type: 'subscription',
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: '%m/%d/%Y', date: '$delivery_date' },
            },
          },
          items: { $sum: { $size: '$selected_meal_type' } },
          subscription: { $addToSet: { $toString: '$subscription_id' } },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          items: 1,
          subscription: 1,
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ]);

    // Convert to object map
    const dateObjectForMeals = {};
    deliveryData.forEach(({ date, items, subscription }) => {
      dateObjectForMeals[date] = { items, subscription };
    });

    // Aggregation for recipes
    const recipeData = await this.dumpRecipesModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $unwind: '$recipes',
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%m/%d/%Y', date: '$date' } },
            meal_category: '$recipes.meal_category',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          recipe_count: {
            $push: { k: '$_id.meal_category', v: '$count' },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          recipe_count: { $arrayToObject: '$recipe_count' },
        },
      },
      {
        $sort: {
          date: 1,
        },
      },
    ]);

    // Merge recipe data into meal plan object
    recipeData.forEach(({ date, recipe_count }) => {
      if (!dateObjectForMeals[date]) {
        dateObjectForMeals[date] = {};
      }
      dateObjectForMeals[date].recipe_count = recipe_count;
    });

    return dateObjectForMeals;
  }

  async getProcessBarForAutoSelection(
    mealPlanDto: RecipeMenuLiveDto,
  ): Promise<any> {
    const finalDates = [];

    mealPlanDto?.dates?.map((dateitm) => {
      finalDates?.push(
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
      );
    });
    finalDates.sort((a, b) => a - b);

    const totalAutoSelectionCount = await this.deliveryModel.countDocuments({
      is_processed: true,
      delivery_date: { $in: finalDates },
      delivery_type: 'subscription',
      not_deliverable: false,
      is_delivery_freezed: false,
    });
    const totalCount = await this.deliveryModel.countDocuments({
      // is_processed: true,
      delivery_date: { $in: finalDates },
      delivery_type: 'subscription',
      not_deliverable: false,
      is_delivery_freezed: false,
    });

    const percentage = totalAutoSelectionCount / totalCount;

    if (Number(percentage) == 1) {
      await this.dumpRecipesModel.updateMany(
        { date: { $in: finalDates } },
        { $set: { auto_selection_flag: true } },
      );
    }

    const dateWiseSelectionCount = await this.deliveryModel.aggregate([
      {
        $match: {
          // is_processed: true,
          delivery_date: { $in: finalDates },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$delivery_date' },
          },
          total: { $sum: 1 },
          selected: {
            $sum: {
              $cond: { if: { $eq: ['$is_processed', true] }, then: 1, else: 0 },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          total: 1,
          selected: 1,
        },
      },
    ]);

    return {
      selected: totalAutoSelectionCount,
      total: totalCount,
      datewise: dateWiseSelectionCount,
    };
  }

  async getProcessBarForNotification(
    mealPlanDto: ProgressNotificationDto,
  ): Promise<any> {
    const finalDates = [];

    mealPlanDto?.dates?.map((dateitm) => {
      finalDates?.push(
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
      );
    });
    finalDates.sort((a, b) => a - b);

    const totalCustomers = await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_date: { $in: finalDates },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
        },
      },
      {
        $group: {
          _id: '$customer_id',
          count: { $sum: 1 },
          data: { $push: '$customer_id' },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          count: 1,
          _id: 0,
        },
      },
    ]);

    const sentData = await this.notificationHistoriesModel.aggregate([
      {
        $match: {
          type_of_notification_master: 'menu_weekly_notification',
          date: {
            $gte: new Date(
              moment(new Date(mealPlanDto?.current_date))
                .startOf('day')
                .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
            ),
            $lte: new Date(
              moment(new Date(mealPlanDto?.current_date))
                .endOf('day')
                .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
            ),
          },
        },
      },
      {
        $group: {
          _id: '$customer_id',
          notification_type: {
            $push: {
              type: '$notification_type',
              status: {
                sentCount: {
                  $sum: {
                    $cond: [
                      {
                        $ne: ['$status', 'FAILED'],
                      },
                      1,
                      0,
                    ],
                  },
                },
                failedCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ['$status', 'FAILED'],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          },
        },
      },
    ]);
    const notifyData = {
      sms: { sent_count: 0, failed_count: 0 },
      whatsapp: { sent_count: 0, failed_count: 0 },
      email: { sent_count: 0, failed_count: 0 },
    };
    sentData?.map((itm) => {
      itm?.notification_type?.map((notifyItm) => {
        if (notifyItm.type == 'SMS') {
          notifyData.sms.sent_count += notifyItm.status.sentCount;
          notifyData.sms.failed_count += notifyItm.status.failedCount;
        } else if (notifyItm.type == 'Whatsapp') {
          notifyData.whatsapp.sent_count += notifyItm.status.sentCount;
          notifyData.whatsapp.failed_count += notifyItm.status.failedCount;
        } else if (notifyItm.type == 'Email') {
          notifyData.email.sent_count += notifyItm.status.sentCount;
          notifyData.email.failed_count += notifyItm.status.failedCount;
        }
      });
    });

    const finalData: any = {
      sms: {
        ...notifyData.sms,
        total_customer_count: parseInt(totalCustomers?.[0]?.count),
      },
      whatsapp: {
        ...notifyData.whatsapp,
        total_customer_count: parseInt(totalCustomers?.[0]?.count),
      },
      email: {
        ...notifyData.email,
        total_customer_count: parseInt(totalCustomers?.[0]?.count),
      },
    };
    // const totalCustomerAccToDate = await this.deliveryModel.aggregate({});
    let notification_flag = true;
    for (const key in finalData) {
      const sentCount = parseInt(finalData[key].sent_count || 0, 10);
      const failedCount = parseInt(finalData[key].failed_count || 0, 10);
      const totalCustomerCount = parseInt(
        finalData[key].total_customer_count || 1,
        10,
      );

      const ratio: any = (sentCount + failedCount) / totalCustomerCount;
      if (parseInt(ratio) != 1) {
        // Your code here
        notification_flag = false;
      }
    }

    await this.dumpRecipesModel.updateMany(
      { date: { $in: finalDates } },
      { $set: { notification_flag: notification_flag } },
    );
    return finalData;
  }

  async getSaveStepperForAutoSelection(
    mealPlanDto: RecipeMenuLiveDto,
  ): Promise<any> {
    const finalDates = [];

    mealPlanDto?.dates?.map((dateitm) => {
      finalDates?.push(
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
      );
    });
    finalDates.sort((a, b) => a - b);
    const dumpData = await this.dumpRecipesModel.aggregate([
      {
        $match: {
          date: { $in: finalDates },
        },
      },
      {
        $group: {
          _id: '$date',
          all_steps_done: {
            $first: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$dump_recipe_flag', true] },
                    { $eq: ['$auto_selection_flag', true] },
                    { $eq: ['$notification_flag', true] },
                    { $eq: ['$live_on_frontend_flag', true] },
                  ],
                },
                then: true,
                else: false,
              },
            },
          },
          dump_recipe_flag: { $first: '$dump_recipe_flag' },
          auto_selection_flag: { $first: '$auto_selection_flag' },
          notification_flag: { $first: '$notification_flag' },
          auto_selection_progress_flag: {
            $first: '$auto_selection_progress_flag',
          },
          live_on_frontend_flag: { $first: '$live_on_frontend_flag' },
          notification_progress_flag: { $first: '$notification_progress_flag' },
          menu_id: { $first: '$menu_id' },
        },
      },
    ]);

    return dumpData;
  }

  async getReportForAutoSelection(
    mealPlanDto: RecipeMenuLiveDto,
  ): Promise<any> {
    return await autoSelectionReportHelper(mealPlanDto, this.deliveryModel);
  }

  async generateCsv(mealPlanDto: RecipeMenuLiveDto): Promise<any> {
    // Parse and sort dates
    const finalDates = (mealPlanDto?.dates || []).map(
      (dateitm) =>
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
    );
    finalDates.sort((a: any, b: any) => a - b);

    const workbook = new ExcelJS.Workbook();

    // Process each date individually — avoids loading all data at once
    for (const singleDate of finalDates) {
      const aggregatedData = await this.deliveryModel.aggregate([
        {
          $match: {
            delivery_date: singleDate,
            not_deliverable: false,
            is_delivery_freezed: false,
            delivery_type: 'subscription',
          },
        },
        { $project: { delivery_item: 1 } },
        { $unwind: '$delivery_item' },
        {
          $addFields: {
            meal_category: {
              $switch: {
                branches: [
                  {
                    case: {
                      $in: ['$delivery_item.meal_type', ['lunch', 'dinner']],
                    },
                    then: 'meal',
                  },
                  {
                    case: { $eq: ['$delivery_item.meal_type', 'breakfast'] },
                    then: 'breakfast',
                  },
                  {
                    case: {
                      $in: [
                        '$delivery_item.meal_type',
                        ['morning_snack', 'evening_snack'],
                      ],
                    },
                    then: 'snack',
                  },
                ],
                default: null,
              },
            },
          },
        },
        { $match: { meal_category: { $ne: null } } },
        {
          $group: {
            _id: {
              category: '$meal_category',
              dish_id: '$delivery_item.selected_meal._id',
              dish_name: '$delivery_item.selected_meal.dish_name',
              protein_option: {
                $ifNull: [
                  '$delivery_item.selected_meal.variants.protein_option',
                  null,
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]);

      if (!aggregatedData || aggregatedData.length === 0) continue;

      const formattedDate = moment(singleDate).format('DD MMM YYYY');
      const worksheet = workbook.addWorksheet(formattedDate);

      worksheet.addRow(['Date', '', formattedDate]);
      worksheet.addRow(['', '', '']);
      worksheet.mergeCells('A2:C2');

      // Build category maps from aggregated results (~20-30 rows vs thousands)
      const breakfastMap = new Map<string, { name: string; count: number }>();
      const mealMap = new Map<
        string,
        { name: string; count: number; variants: Map<string, number> }
      >();
      const snackMap = new Map<string, { name: string; count: number }>();
      let breakfastCount = 0;
      let mealCount = 0;
      let snackCount = 0;

      aggregatedData.forEach((row) => {
        const { category, dish_id, dish_name, protein_option } = row._id;
        const count = row.count;
        const idStr = dish_id?.toString();

        if (category === 'breakfast') {
          breakfastCount += count;
          if (breakfastMap.has(idStr)) {
            breakfastMap.get(idStr).count += count;
          } else {
            breakfastMap.set(idStr, { name: dish_name, count });
          }
        } else if (category === 'meal') {
          mealCount += count;
          if (mealMap.has(idStr)) {
            const existing = mealMap.get(idStr);
            existing.count += count;
            if (protein_option) {
              existing.variants.set(
                protein_option,
                (existing.variants.get(protein_option) || 0) + count,
              );
            }
          } else {
            const variants = new Map<string, number>();
            if (protein_option) variants.set(protein_option, count);
            mealMap.set(idStr, { name: dish_name, count, variants });
          }
        } else if (category === 'snack') {
          snackCount += count;
          if (snackMap.has(idStr)) {
            snackMap.get(idStr).count += count;
          } else {
            snackMap.set(idStr, { name: dish_name, count });
          }
        }
      });

      // Write breakfast rows
      if (breakfastMap.size > 0) {
        worksheet.addRow(['BREAKFAST', '', breakfastCount]);
        worksheet.addRow(['']);
        let idx = 1;
        breakfastMap.forEach((item) => {
          worksheet.addRow([idx++, item.name, item.count]);
        });
        worksheet.addRow(['']);
      }

      // Write meal rows
      if (mealMap.size > 0) {
        worksheet.addRow(['MEAL', '', mealCount]);
        worksheet.addRow(['']);
        let idx = 1;
        mealMap.forEach((item) => {
          worksheet.addRow([idx++, item.name, item.count]);
          item.variants.forEach((varCount, varName) => {
            worksheet.addRow(['', '-' + varName, varCount]);
          });
        });
        worksheet.addRow(['']);
      }

      // Write snack rows
      if (snackMap.size > 0) {
        worksheet.addRow(['SNACK', '', snackCount]);
        worksheet.addRow(['']);
        let idx = 1;
        snackMap.forEach((item) => {
          worksheet.addRow([idx++, item.name, item.count]);
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

function getUncommonElements(array1, array2) {
  // Filter elements that are in array1 but not in array2
  const uniqueToArray1 = array1.filter((item) => !array2.includes(item));

  // Filter elements that are in array2 but not in array1
  const uniqueToArray2 = array2.filter((item) => !array1.includes(item));

  // Combine the unique elements from both arrays
  const uncommonElements = [...uniqueToArray1, ...uniqueToArray2];

  return uncommonElements;
}

async function autoSelectionReportHelper(mealPlanDto, deliveryMODEL) {
  // Build date array
  const finalDates =
    mealPlanDto?.dates?.map(
      (dateitm) =>
        new Date(
          moment(new Date(dateitm))
            .startOf('day')
            .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        ),
    ) || [];
  finalDates.sort((a, b) => a - b);

  // Aggregation: all grouping/counting happens in MongoDB, returns ~50-100 rows
  const aggregatedData = await deliveryMODEL.aggregate([
    {
      $match: {
        delivery_date: { $in: finalDates },
        not_deliverable: false,
        is_delivery_freezed: false,
        delivery_type: 'subscription',
      },
    },
    { $project: { delivery_date: 1, delivery_item: 1 } },
    { $unwind: '$delivery_item' },
    {
      $addFields: {
        meal_category: {
          $switch: {
            branches: [
              {
                case: {
                  $in: ['$delivery_item.meal_type', ['lunch', 'dinner']],
                },
                then: 'meal',
              },
              {
                case: { $eq: ['$delivery_item.meal_type', 'breakfast'] },
                then: 'breakfast',
              },
              {
                case: {
                  $in: [
                    '$delivery_item.meal_type',
                    ['morning_snack', 'evening_snack'],
                  ],
                },
                then: 'snack',
              },
            ],
            default: null,
          },
        },
      },
    },
    { $match: { meal_category: { $ne: null } } },
    {
      $group: {
        _id: {
          date: '$delivery_date',
          category: '$meal_category',
          dish_id: '$delivery_item.selected_meal._id',
          dish_name: '$delivery_item.selected_meal.dish_name',
          protein_option: {
            $ifNull: [
              '$delivery_item.selected_meal.variants.protein_option',
              null,
            ],
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  // Restructure aggregated rows into the expected output format
  let totalBreakfast = 0;
  let totalMeal = 0;
  let totalSnack = 0;

  const dateMap = new Map<
    string,
    {
      date: string;
      breakfastMap: Map<string, { name: string; count: number; id: string }>;
      mealMap: Map<
        string,
        {
          name: string;
          id: string;
          count: number;
          variants: Map<string, number>;
        }
      >;
      snackMap: Map<string, { name: string; count: number; id: string }>;
      breakfastCount: number;
      mealCount: number;
      snackCount: number;
    }
  >();

  aggregatedData.forEach((row) => {
    const { date, category, dish_id, dish_name, protein_option } = row._id;
    const count = row.count;
    const dateKey = moment(new Date(date)).format('MM/DD/YYYY');
    const idStr = dish_id?.toString();

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {
        date: dateKey,
        breakfastMap: new Map(),
        mealMap: new Map(),
        snackMap: new Map(),
        breakfastCount: 0,
        mealCount: 0,
        snackCount: 0,
      });
    }
    const entry = dateMap.get(dateKey);

    if (category === 'breakfast') {
      totalBreakfast += count;
      entry.breakfastCount += count;
      if (entry.breakfastMap.has(idStr)) {
        entry.breakfastMap.get(idStr).count += count;
      } else {
        entry.breakfastMap.set(idStr, { name: dish_name, count, id: idStr });
      }
    } else if (category === 'meal') {
      totalMeal += count;
      entry.mealCount += count;
      if (entry.mealMap.has(idStr)) {
        const existing = entry.mealMap.get(idStr);
        existing.count += count;
        if (protein_option) {
          existing.variants.set(
            protein_option,
            (existing.variants.get(protein_option) || 0) + count,
          );
        }
      } else {
        const variants = new Map<string, number>();
        if (protein_option) variants.set(protein_option, count);
        entry.mealMap.set(idStr, {
          name: dish_name,
          id: idStr,
          count,
          variants,
        });
      }
    } else if (category === 'snack') {
      totalSnack += count;
      entry.snackCount += count;
      if (entry.snackMap.has(idStr)) {
        entry.snackMap.get(idStr).count += count;
      } else {
        entry.snackMap.set(idStr, { name: dish_name, count, id: idStr });
      }
    }
  });

  // Convert Maps to the expected array format
  const finalPayload = [];
  dateMap.forEach((entry) => {
    finalPayload.push({
      date: entry.date,
      breakfastCount: entry.breakfastCount,
      mealCount: entry.mealCount,
      snackCount: entry.snackCount,
      breakfast: Array.from(entry.breakfastMap.values()),
      meal: Array.from(entry.mealMap.values()).map((m) => ({
        name: m.name,
        id: m.id,
        count: m.count,
        variants: Array.from(m.variants.entries()).map(([name, count]) => ({
          name,
          count,
        })),
      })),
      snack: Array.from(entry.snackMap.values()),
    });
  });

  return {
    total_breakfast: totalBreakfast,
    total_count: totalMeal,
    total_snack: totalSnack,
    data: finalPayload,
  };
}
