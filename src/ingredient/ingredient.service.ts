import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
  getUpdatedSupplierDetails,
  PriceUpdateService,
} from 'src/common/utils/helper';
import { ComponentDocument } from 'src/component/Schemas/component.schema';
import { ReplaceIngredientDto } from './dto/replace-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { IngredientDocument } from './schemas/ingredient.schema';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { SupplierDocument } from 'src/supplier/schemas/supplier.schemas';
import { HistoryService } from 'src/history/history.service';
import { message } from 'src/common/assets';
import { Translate } from 'src/translation/schemas/translation.schema';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { MasterDataDocument } from 'src/masterdata/Schemas/masterdata.schema';

@Injectable()
export class IngredientService {
  constructor(
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('Supplier')
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel('MasterDataKMS')
    private readonly masterDataModel: Model<MasterDataDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('Subscriptions')
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    private readonly priceUpdateService: PriceUpdateService,
    private readonly historyService: HistoryService,
    @InjectModel('translations')
    private translationModel: Model<Translate>,
  ) {}

  async create(
    createIngredientDto: CreateIngredientDto,
  ): Promise<IngredientDocument> {
    try {
      createIngredientDto.name_of_customers =
        createIngredientDto.name_of_customers?.trim();
      const updatedSupplierDetails =
        await getUpdatedSupplierDetails(createIngredientDto);
      const createdIngredient = await this.ingredientModel.create(
        updatedSupplierDetails,
      );
      if (createdIngredient?.is_active === true) {
        const ingredientAllData = await this.ingredientModel
          .findById(createdIngredient?._id)
          .populate('category');
        if (ingredientAllData?.category?.length > 0) {
          const categoryData =
            ingredientAllData?.category?.map(
              (categoryItm: any) => categoryItm?.value?.key,
            ) || [];
          console.log('category data', categoryData);

          (async () => {
            try {
              const BATCH_SIZE = 1000;
              const totalDocs = await this.subscriptionModel.countDocuments({
                avoid_category: { $in: categoryData },
                avoid_ingredients: {
                  $ne: createdIngredient?.name_of_customers,
                },
              });

              if (totalDocs > 0) {
                for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
                  await this.subscriptionModel.updateMany(
                    {
                      avoid_category: { $in: categoryData },
                      avoid_ingredients: {
                        $ne: createdIngredient?.name_of_customers,
                      },
                    },
                    {
                      $push: {
                        avoid_ingredients: createdIngredient?.name_of_customers,
                      },
                      $set: { updatedAt: new Date() },
                    },
                    {
                      skip,
                      limit: BATCH_SIZE,
                    },
                  );
                }
              }
            } catch (error) {
              console.error('Error updating subscriptions:', error);
            }
          })();
        }
      }
      return createdIngredient;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error creating ingredient with translations',
      );
    }
  }
  async findIngredientBySearch(query: string): Promise<any[]> {
    return await this.ingredientModel
      .find({
        name: { $regex: query, $options: 'i' }, // 'i' for case-insensitive
      })
      .select('name _id')
      .exec();
  }
  async ingredient(
    search?: string,
    page: any = 1,
    limit: any = 10,
    sort: string = 'name',
    order: any = 1,
  ): Promise<any> {
    const safePage = Math.max(1, parseInt(page) || 1);
    const inputLimit = parseInt(limit) || 10;
    const safeLimit = Math.min(100, Math.max(1, inputLimit)); // Hard cap at 100
    const safeOrder = parseInt(order) === -1 ? -1 : 1;
    const skip = (safePage - 1) * safeLimit;

    const createdAtDate = new Date('2024-04-16T10:22:29.464Z');

    const matchQuery: any = {
      createdAt: { $gt: createdAtDate },
    };

    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (safeLimit <= 0) {
      matchQuery.supplier_details = { $exists: true, $not: { $size: 0 } };
    }

    try {
      const pipeline: any[] = [
        { $match: matchQuery },
        { $sort: { [sort]: safeOrder } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              { $skip: skip },
              ...(safeLimit > 0 ? [{ $limit: safeLimit }] : []),

              // Recursive Lookups
              {
                $graphLookup: {
                  from: 'components',
                  startWith: '$_id',
                  connectFromField: '_id',
                  connectToField: 'composition.ingredient_id',
                  as: 'allComponents',
                  maxDepth: 10,
                },
              },
              {
                $graphLookup: {
                  from: 'recipes_details',
                  startWith: '$allComponents._id',
                  connectFromField: '_id',
                  connectToField: 'composition.component_id',
                  as: 'allRecipes',
                  maxDepth: 10,
                },
              },
              {
                $addFields: {
                  active_supplier: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$supplier_details',
                          as: 's',
                          cond: { $eq: ['$$s.is_active', true] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: 'suppliers',
                  localField: 'active_supplier.supplier',
                  foreignField: '_id',
                  as: 'supplierInfo',
                },
              },

              // FINAL CLEAN PROJECTION (Matches your 'old' output)
              {
                $project: {
                  _id: 1,
                  name: 1,
                  category: 1,
                  waste: 1,
                  package_type: 1,
                  is_active: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  supplier: { $arrayElemAt: ['$supplierInfo.company', 0] },
                  recipe_count: { $size: '$allRecipes' },
                  sub_recipe_count: { $size: '$allComponents' },

                  // Trimming the detailed objects back to just ID and Name
                  recipe_list: {
                    $map: {
                      input: '$allRecipes',
                      as: 'r',
                      in: { _id: '$$r._id', dish_name: '$$r.dish_name' },
                    },
                  },
                  sub_recipe_list: {
                    $map: {
                      input: '$allComponents',
                      as: 'c',
                      in: { _id: '$$c._id', name: '$$c.name' },
                    },
                  },

                  single_package: {
                    $cond: [
                      {
                        $gt: [
                          '$active_supplier.single_package.per_kg_price',
                          null,
                        ],
                      },
                      {
                        $concat: [
                          {
                            $toString:
                              '$active_supplier.single_package.per_kg_price',
                          },
                          ' /kg',
                        ],
                      },
                      'NaN /kg', // Match your screenshot's "NaN /kg" style if price missing
                    ],
                  },
                  bulk_package: {
                    $cond: [
                      {
                        $gt: [
                          '$active_supplier.bulk_package.per_kg_price',
                          null,
                        ],
                      },
                      {
                        $concat: [
                          {
                            $toString:
                              '$active_supplier.bulk_package.per_kg_price',
                          },
                          ' /kg',
                        ],
                      },
                      'NaN /kg',
                    ],
                  },
                },
              },
            ],
          },
        },
      ];

      const [result] = await this.ingredientModel
        .aggregate(pipeline)
        .allowDiskUse(true);

      const totalIngredients = result.metadata[0]?.total || 0;
      const totalPages =
        safeLimit > 0 ? Math.ceil(totalIngredients / safeLimit) : 1;

      return {
        list: result.data,
        totalIngredients,
        currentPage: safePage,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }

  async ingredientList(
    search?: string,
    page: any = 1,
    limit: any = 0,
    sort: string = 'name',
    order: any = 1,
  ): Promise<any> {
    // 1. Strict Type Casting & Sanitization
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = parseInt(limit) || 0;
    const safeOrder = parseInt(order) === -1 ? -1 : 1;
    const safeSort = ['name', 'createdAt', 'updatedAt', 'category'].includes(
      sort,
    )
      ? sort
      : 'name';

    const sanitizedSearch = search
      ? search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      : '';
    const createdAtDate = new Date('2024-04-16T10:22:29.464Z');

    // 2. Build Query
    const matchQuery: any = {
      createdAt: { $gt: createdAtDate },
    };

    if (sanitizedSearch) {
      matchQuery.$or = [
        { name: { $regex: new RegExp(sanitizedSearch, 'i') } },
        { description: { $regex: new RegExp(sanitizedSearch, 'i') } },
      ];
    }

    // Handle the "no limit" supplier logic
    if (safeLimit <= 0) {
      matchQuery.supplier_details = { $ne: [] };
    }

    try {
      const pipeline: any[] = [
        { $match: matchQuery },
        // 3. Add helper fields for sorting before Facet
        {
          $addFields: {
            is_exact_match: {
              $eq: [{ $toLower: '$name' }, sanitizedSearch.toLowerCase()],
            },
            starts_with_search: {
              $cond: [
                { $ne: [sanitizedSearch, ''] },
                {
                  $regexMatch: {
                    input: '$name',
                    regex: new RegExp(`^${sanitizedSearch}`, 'i'),
                  },
                },
                false,
              ],
            },
          },
        },
        // Sort priority: Exact > Starts With > User Sort
        {
          $sort: {
            is_exact_match: -1,
            starts_with_search: -1,
            [safeSort]: safeOrder,
          },
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              // Pagination logic
              ...(safeLimit > 0
                ? [{ $skip: (safePage - 1) * safeLimit }, { $limit: safeLimit }]
                : []),

              // 4. Lookups & Data Shaping
              {
                $addFields: {
                  active_supplier: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$supplier_details',
                          as: 's',
                          cond: { $eq: ['$$s.is_active', true] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
              {
                $lookup: {
                  from: 'suppliers',
                  localField: 'active_supplier.supplier',
                  foreignField: '_id',
                  as: 'supplier_info',
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  name_of_customers: 1,
                  package_type: 1,
                  is_active: 1,
                  category: 1,
                  waste: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  is_exact_match: 1,
                  starts_with_search: 1,
                  supplier: { $arrayElemAt: ['$supplier_info.company', 0] },
                  single_package: {
                    $cond: [
                      {
                        $gt: [
                          '$active_supplier.single_package.per_kg_price',
                          null,
                        ],
                      },
                      {
                        $concat: [
                          {
                            $toString:
                              '$active_supplier.single_package.per_kg_price',
                          },
                          ' /kg',
                        ],
                      },
                      undefined,
                    ],
                  },
                  bulk_package: {
                    $cond: [
                      {
                        $gt: [
                          '$active_supplier.bulk_package.per_kg_price',
                          null,
                        ],
                      },
                      {
                        $concat: [
                          {
                            $toString:
                              '$active_supplier.bulk_package.per_kg_price',
                          },
                          ' /kg',
                        ],
                      },
                      undefined,
                    ],
                  },
                },
              },
            ],
          },
        },
      ];

      const [result] = await this.ingredientModel
        .aggregate(pipeline)
        .allowDiskUse(true);

      const totalIngredients = result?.metadata[0]?.total || 0;
      const ingredients = result?.data || [];

      const totalPages =
        safeLimit > 0 ? Math.ceil(totalIngredients / safeLimit) : 0;

      // Return exact same response structure
      return {
        list: ingredients,
        totalIngredients,
        currentPage: safePage,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }

  async getById(userId: string): Promise<IngredientDocument> {
    const pipeline: any[] = [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $addFields: {
          active_supplier: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$supplier_details',
                  as: 'supplier',
                  cond: {
                    $eq: ['$$supplier.is_active', true],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'active_supplier.supplier',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      {
        $graphLookup: {
          from: 'components',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'composition.ingredient_id',
          as: 'allComponents',
          maxDepth: 10,
        },
      },
      {
        $graphLookup: {
          from: 'recipes_details',
          startWith: {
            $map: {
              input: '$allComponents',
              as: 'comp',
              in: '$$comp._id',
            },
          },
          connectFromField: '_id',
          connectToField: 'composition.component_id',
          as: 'allRecipes',
          maxDepth: 10,
        },
      },
      {
        $lookup: {
          from: 'ratings',
          localField: 'allRecipes._id',
          foreignField: 'recipe_id',
          as: 'recipeRatings',
        },
      },
      {
        $addFields: {
          allRecipes: {
            $map: {
              input: '$allRecipes',
              as: 'recipe',
              in: {
                _id: '$$recipe._id',
                dish_name: '$$recipe.dish_name',
                latest_week_rating: {
                  $let: {
                    vars: {
                      latestDate: {
                        $max: {
                          $map: {
                            input: {
                              $filter: {
                                input: '$recipeRatings',
                                as: 'rt',
                                cond: {
                                  $eq: ['$$rt.recipe_id', '$$recipe._id'],
                                },
                              },
                            },
                            as: 'filteredRating',
                            in: '$$filteredRating.delivery_date',
                          },
                        },
                      },
                    },
                    in: {
                      $round: [
                        {
                          $avg: {
                            $map: {
                              input: {
                                $filter: {
                                  input: '$recipeRatings',
                                  as: 'rt',
                                  cond: {
                                    $and: [
                                      {
                                        $eq: ['$$rt.recipe_id', '$$recipe._id'],
                                      },
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
                                                    $dayOfWeek: '$$latestDate',
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
                                                    $dayOfWeek: '$$latestDate',
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
                              as: 'filteredRatings',
                              in: '$$filteredRatings.rating',
                            },
                          },
                        },
                        2,
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          name_of_customers: 1,
          name_of_customers_tl: 1,
          show_customers: 1,
          category: 1,
          storage_location: 1,
          ingredient_type: 1,
          shelf_life: 1,
          shelf_life_unit: 1,
          waste: 1,
          unit_of_measurement: 1,
          is_weighted: 1,
          is_piece: 1,
          package_type: 1,
          is_active: 1,
          allergens: 1,
          diet_type: 1,
          createdAt: 1,
          updatedAt: 1,
          supplier_details: 1,
          nutrition: 1,
          allComponents: {
            _id: 1,
            name: 1,
          },
          allRecipes: 1,
        },
      },
      {
        $addFields: {
          recipe_count: { $size: '$allRecipes' },
          sub_recipe_count: { $size: '$allComponents' },
        },
      },
      {
        $project: {
          recipe_list: {
            $sortArray: {
              input: '$allRecipes',
              sortBy: 1,
            },
          },
          sub_recipe_list: {
            $sortArray: {
              input: '$allComponents',
              sortBy: 1,
            },
          },
          recipe_count: 1,
          sub_recipe_count: 1,
          single_package: 1,
          bulk_package: 1,
          supplier: 1,
          _id: 1,
          name: 1,
          name_of_customers: 1,
          name_of_customers_tl: 1,
          category: 1,
          storage_location: 1,
          ingredient_type: 1,
          shelf_life: 1,
          shelf_life_unit: 1,
          waste: 1,
          unit_of_measurement: 1,
          is_weighted: 1,
          is_piece: 1,
          package_type: 1,
          is_active: 1,
          allergens: 1,
          diet_type: 1,
          createdAt: 1,
          updatedAt: 1,
          supplier_details: 1,
          nutrition: 1,
          show_customers: 1,
        },
      },
    ];

    const ingredients = await this.ingredientModel.aggregate(pipeline);
    return ingredients[0] || {};
  }
  async delete(userId: string): Promise<IngredientDocument> {
    const ingredientData = await this.ingredientModel.findByIdAndDelete(userId);
    console.log('delete ingredient Data==>', ingredientData);
    if (ingredientData?.is_active == true) {
      (async () => {
        try {
          const BATCH_SIZE = 1000;
          const totalDocs = await this.subscriptionModel.countDocuments({
            avoid_ingredients: ingredientData.name_of_customers,
          });

          if (totalDocs > 0) {
            for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
              await this.subscriptionModel.updateMany(
                {
                  avoid_ingredients: ingredientData.name_of_customers,
                },
                {
                  $pull: {
                    avoid_ingredients: ingredientData.name_of_customers,
                  },
                  $set: { updatedAt: new Date() },
                },
                {
                  skip,
                  limit: BATCH_SIZE,
                },
              );
            }
          }
        } catch (error) {
          console.error('Error removing ingredient from subscriptions:', error);
        }
      })();
    }
    return;
  }

  async update(
    user: any,
    userId: string,
    updateUser: UpdateIngredientDto,
  ): Promise<IngredientDocument> {
    updateUser.name_of_customers = updateUser.name_of_customers?.trim();
    const updatedSupplierDetailsData =
      await getUpdatedSupplierDetails(updateUser);

    const UpdateIngredient = await this.ingredientModel
      .findByIdAndUpdate(userId, updatedSupplierDetailsData, {
        new: false,
        returnOriginal: true,
      })
      .lean()
      .exec();

    //////////////////////////History /////////////////////////////////
    const { before_changes, current_changes } =
      await this.historyService.getChangedFields(UpdateIngredient, updateUser);
    console.log('before and after changes', before_changes, current_changes);
    await this.priceUpdateService.getSubRecipePlusComponentUpdateAfterUpdate(
      userId,
      'ingredient_id',
    );

    const ingredientData = await this.ingredientModel
      .findById(UpdateIngredient?._id)
      .populate('category');

    const olderCategory = UpdateIngredient?.category || [];
    const newCateory =
      ingredientData?.category?.map((categoryItm: any) =>
        categoryItm?._id?.toString(),
      ) || [];

    const added = newCateory.filter((id) => !olderCategory.includes(id));
    const removed = olderCategory.filter((id) => !newCateory.includes(id));
    const remaining = olderCategory.filter((id) => newCateory.includes(id));

    if (
      UpdateIngredient?.is_active == true &&
      ingredientData?.is_active == false
    ) {
      (async () => {
        try {
          const BATCH_SIZE = 1000;
          const totalDocs = await this.subscriptionModel.countDocuments({
            avoid_ingredients: UpdateIngredient?.name_of_customers,
          });
          if (totalDocs > 0) {
            for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
              await this.subscriptionModel.updateMany(
                {
                  avoid_ingredients: UpdateIngredient?.name_of_customers,
                },
                {
                  $pull: {
                    avoid_ingredients: UpdateIngredient?.name_of_customers,
                  },
                  $set: { updatedAt: new Date() },
                },
                {
                  skip,
                  limit: BATCH_SIZE,
                },
              );
            }
          }
        } catch (error) {
          console.error('Error removing ingredient from subscriptions:', error);
        }
      })();
      console.log('inside false condition');
    }

    if (ingredientData?.is_active == true) {
      console.log('inside true condition');
      let usedAny = false;
      if (
        UpdateIngredient?.name_of_customers &&
        ingredientData?.name_of_customers
      ) {
        if (
          UpdateIngredient?.name_of_customers !=
            ingredientData?.name_of_customers &&
          UpdateIngredient?.is_active == true
        ) {
          usedAny = true;
          (async () => {
            try {
              const BATCH_SIZE = 1000;
              const totalDocs = await this.subscriptionModel.countDocuments({
                avoid_ingredients: UpdateIngredient.name_of_customers,
              });

              if (totalDocs > 0) {
                for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
                  await this.subscriptionModel.updateMany(
                    {
                      avoid_ingredients: UpdateIngredient.name_of_customers,
                    },
                    {
                      $set: {
                        'avoid_ingredients.$[element]':
                          ingredientData.name_of_customers,
                      },
                      updatedAt: new Date(),
                    },
                    {
                      arrayFilters: [
                        { element: UpdateIngredient.name_of_customers },
                      ],
                      skip,
                      limit: BATCH_SIZE,
                    },
                  );
                }
              }
            } catch (error) {
              console.error(
                'Error updating ingredient name in subscriptions:',
                error,
              );
            }
          })();
        }
      }
      if (added?.length > 0 && UpdateIngredient?.is_active == true) {
        usedAny = true;
        (async () => {
          try {
            const categoryRawData = await this.masterDataModel.find({
              _id: {
                $in: added?.map(
                  (addItm) => new mongoose.Types.ObjectId(addItm),
                ),
              },
            });
            const categoryData =
              categoryRawData?.map(
                (categoryItm: any) => categoryItm?.value?.key,
              ) || [];
            console.log('category data', categoryData);
            const BATCH_SIZE = 1000;
            const totalDocs = await this.subscriptionModel.countDocuments({
              avoid_category: { $in: categoryData },
              avoid_ingredients: { $ne: ingredientData?.name_of_customers },
            });

            if (totalDocs > 0) {
              for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
                await this.subscriptionModel.updateMany(
                  {
                    avoid_category: { $in: categoryData },
                    avoid_ingredients: {
                      $ne: ingredientData?.name_of_customers,
                    },
                  },
                  {
                    $push: {
                      avoid_ingredients: ingredientData?.name_of_customers,
                    },
                    $set: { updatedAt: new Date() },
                  },
                  {
                    skip,
                    limit: BATCH_SIZE,
                  },
                );
              }
            }
          } catch (error) {
            console.error('Error updating subscriptions:', error);
          }
        })();
      }
      if (removed?.length > 0 && UpdateIngredient?.is_active == true) {
        usedAny = true;
        (async () => {
          try {
            const categoryRawData = await this.masterDataModel.find({
              _id: {
                $in: removed?.map(
                  (rmvItm) => new mongoose.Types.ObjectId(rmvItm),
                ),
              },
            });
            const categoryData =
              categoryRawData?.map(
                (categoryItm: any) => categoryItm?.value?.key,
              ) || [];
            console.log('category data', categoryData);
            const BATCH_SIZE = 1000;
            const totalDocs = await this.subscriptionModel.countDocuments({
              avoid_category: { $in: categoryData },
              avoid_ingredients: { $eq: ingredientData?.name_of_customers },
            });

            if (totalDocs > 0) {
              for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
                await this.subscriptionModel.updateMany(
                  {
                    avoid_category: { $in: categoryData },
                    avoid_ingredients: {
                      $eq: ingredientData?.name_of_customers,
                    },
                  },
                  {
                    $pull: {
                      avoid_ingredients: ingredientData?.name_of_customers,
                    },
                    $set: { updatedAt: new Date() },
                  },
                  {
                    skip,
                    limit: BATCH_SIZE,
                  },
                );
              }
            }
          } catch (error) {
            console.error('Error updating subscriptions:', error);
          }
        })();
      }
      if (
        removed?.length > 0 &&
        remaining?.length > 0 &&
        UpdateIngredient?.is_active == true
      ) {
        usedAny = true;

        (async () => {
          try {
            const categoryRawData = await this.masterDataModel.find({
              _id: {
                $in: remaining?.map(
                  (rmvItm) => new mongoose.Types.ObjectId(rmvItm),
                ),
              },
            });
            const categoryData =
              categoryRawData?.map(
                (categoryItm: any) => categoryItm?.value?.key,
              ) || [];
            console.log('category data', categoryData);
            const BATCH_SIZE = 1000;
            const totalDocs = await this.subscriptionModel.countDocuments({
              avoid_category: { $in: categoryData },
              avoid_ingredients: { $ne: ingredientData?.name_of_customers },
            });

            if (totalDocs > 0) {
              for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
                await this.subscriptionModel.updateMany(
                  {
                    avoid_category: { $in: categoryData },
                    avoid_ingredients: {
                      $ne: ingredientData?.name_of_customers,
                    },
                  },
                  {
                    $push: {
                      avoid_ingredients: ingredientData?.name_of_customers,
                    },
                    $set: { updatedAt: new Date() },
                  },
                  {
                    skip,
                    limit: BATCH_SIZE,
                  },
                );
              }
            }
          } catch (error) {
            console.error('Error updating subscriptions:', error);
          }
        })();
      }
      console.log('used any', usedAny);
      if (!usedAny && UpdateIngredient?.is_active == false) {
        if (ingredientData?.category?.length > 0) {
          const categoryData =
            ingredientData?.category?.map(
              (categoryItm: any) => categoryItm?.value?.key,
            ) || [];
          console.log('category data', categoryData);

          (async () => {
            try {
              const BATCH_SIZE = 1000;
              const totalDocs = await this.subscriptionModel.countDocuments({
                avoid_category: { $in: categoryData },
                avoid_ingredients: { $ne: ingredientData?.name_of_customers },
              });

              if (totalDocs > 0) {
                for (let skip = 0; skip < totalDocs; skip += BATCH_SIZE) {
                  await this.subscriptionModel.updateMany(
                    {
                      avoid_category: { $in: categoryData },
                      avoid_ingredients: {
                        $ne: ingredientData?.name_of_customers,
                      },
                    },
                    {
                      $push: {
                        avoid_ingredients: ingredientData?.name_of_customers,
                      },
                      $set: { updatedAt: new Date() },
                    },
                    {
                      skip,
                      limit: BATCH_SIZE,
                    },
                  );
                }
              }
            } catch (error) {
              console.error('Error updating subscriptions:', error);
            }
          })();
        }
      }
    }

    console.log({ before_changes, current_changes });
    await this.historyService.createHistory(
      user,
      UpdateIngredient._id,
      'ingredient',
      message.history.HISTORY_UPDATE,
      before_changes,
      current_changes,
    );
    return UpdateIngredient;
  }
  async findAllIngredientsByIds(ingredientIds: string[]): Promise<any> {
    try {
      const pipeline: any[] = [
        {
          $match: {
            _id: {
              $in: ingredientIds.map(
                (item) => new mongoose.Types.ObjectId(item),
              ),
            },
          },
        },
        {
          $addFields: {
            active_supplier: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$supplier_details',
                    as: 'supplier',
                    cond: {
                      $eq: ['$$supplier.is_active', true],
                    },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: 'suppliers',
            localField: 'active_supplier.supplier',
            foreignField: '_id',
            as: 'supplier',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            package_type: 1,
            is_active: 1,
            category: 1,
            single_package: {
              $cond: {
                if: {
                  $gt: ['$active_supplier.single_package.per_kg_price', null],
                },
                then: {
                  $concat: [
                    {
                      $toString: '$active_supplier.single_package.per_kg_price',
                    },
                    ' /kg',
                  ],
                },
                else: undefined,
              },
            },
            bulk_package: {
              $cond: {
                if: {
                  $gt: ['$active_supplier.bulk_package.per_kg_price', null],
                },
                then: {
                  $concat: [
                    {
                      $toString: '$active_supplier.bulk_package.per_kg_price',
                    },
                    ' /kg',
                  ],
                },
                else: undefined,
              },
            },
            supplier: {
              $arrayElemAt: ['$supplier.company', 0],
            },
            waste: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            waste: 1,
            package_type: 1,
            is_active: 1,
            category: 1,
            single_package: 1,
            bulk_package: 1,
            supplier: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ];

      const ingredients = await this.ingredientModel.aggregate(pipeline);

      return {
        list: ingredients,
        totalIngredients: ingredients.length,
        currentPage: 1,
        totalPages: 0,
      };
    } catch (error) {
      throw error; // You can handle or log the error as needed
    }
  }
  async replace(
    userId: string,
    replaceIngredientDto: ReplaceIngredientDto,
  ): Promise<void> {
    const componentIdsData = await this.getComponentIds(
      replaceIngredientDto.recipeIds,
      replaceIngredientDto.ingredient_id,
    );
    console.log('componentIdsData', componentIdsData);
    await Promise.all(
      componentIdsData.map(async (componentData: any) => {
        const componentId = componentData.component_id;
        const previousComponent = await this.componentModel
          .findById(componentId)
          .lean()
          .exec();

        if (previousComponent?.composition) {
          const itemIndex = previousComponent.composition.findIndex(
            (item) =>
              item.ingredient_id.toString() ===
              replaceIngredientDto.ingredient_id,
          );
          console.log('itemIndex', itemIndex);
          if (itemIndex !== -1) {
            const updatedComposition = previousComponent.composition.map(
              (item) => {
                if (
                  item.ingredient_id.toString() ===
                  replaceIngredientDto.ingredient_id
                ) {
                  return {
                    ...item,
                    ingredient_id: new mongoose.Types.ObjectId(
                      replaceIngredientDto.new_ingredient_id,
                    ),
                  };
                } else {
                  return item;
                }
              },
            );
            // previousComponent.composition = updatedComposition;

            // Update the component in the database
            // await this.componentService.update(componentId, newComposition);
            // Update the ingredient at the found index
            // const existingItem = previousComponent.composition[itemIndex];
            // const updatedComposition = {
            //   ...existingItem,
            //   ingredient_id: convertToObjectId(
            //     replaceIngredientDto.new_ingredient_id,
            //   ),
            // };
            // previousComponent.composition[itemIndex] = updatedComposition;
            const newComposition = {
              composition: updatedComposition,
            };
            const updateSubRecipeData =
              await this.priceUpdateService.getUpdatedSubRecipeCompositionPrice(
                newComposition,
              );

            const updateComponent = await this.componentModel
              .findByIdAndUpdate(
                componentId,
                {
                  composition: updateSubRecipeData.composition,
                  calculated_weight: updateSubRecipeData.calculated_weight,
                  calculated_price: updateSubRecipeData.calculated_price,
                },
                {
                  new: false,
                  returnOriginal: true,
                },
              )
              .lean()
              .exec();

            // after update related components and recipe also need to update
            await this.priceUpdateService.getSubRecipePlusComponentUpdateAfterUpdate(
              componentId,
              'component_id',
            );
            await this.priceUpdateService.getRecipeUpdateAfterComponentUpdate(
              componentId,
            );
          }
        }
      }),
    );
  }

  async getComponentIds(recipeIds: any[], ingredient_id: string) {
    const recipeIdArray = recipeIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );
    const pipeline: any[] = [
      {
        $match: {
          _id: {
            $in: recipeIdArray,
          },
        },
      },
      {
        $unwind: {
          path: '$composition',
        },
      },
      {
        $lookup: {
          from: 'components',
          localField: 'composition.component_id',
          foreignField: '_id',
          as: 'component_details',
        },
      },
      {
        $unwind: {
          path: '$component_details',
        },
      },
      {
        $unwind: {
          path: '$component_details.composition',
        },
      },
      {
        $facet: {
          withComponent: [
            {
              $match: {
                'component_details.composition.ingredient_id': {
                  $eq: '',
                },
              },
            },
            {
              $lookup: {
                from: 'components',
                localField: 'component_details.composition.component_id',
                foreignField: '_id',
                as: 'nested_component_details',
              },
            },
            {
              $unwind: {
                path: '$nested_component_details',
              },
            },
            //  {
            //   $unwind: {
            //     path: "$nested_component_details.composition",
            //   },
            // },
            // {
            //   $group: {
            //     _id: "$nested_component_details._id",
            //     name: {
            //       $first:
            //         "$nested_component_details.name",
            //     },
            //   },
            // },
            {
              $project: {
                _id: 1,
                component_id: '$nested_component_details._id',
                name: '$nested_component_details.name',
                ingredient_id:
                  '$nested_component_details.composition.ingredient_id',
              },
            },
          ],
          withoutComponent: [
            {
              $match: {
                'component_details.composition.component_id': {
                  $eq: '',
                },
              },
            },
            // {
            //   $group: {
            //     _id: "$component_details._id",
            //     name: {
            //       $first: "$component_details.name",
            //     },
            //   },
            // },
            {
              $unwind: {
                path: '$component_details.composition',
              },
            },
            {
              $project: {
                _id: 1,
                component_id: '$component_details._id',
                name: '$component_details.name',
                ingredient_id: '$component_details.composition.ingredient_id',
              },
            },
          ],
        },
      },
      {
        $project: {
          combinedResults: {
            $concatArrays: ['$withComponent', '$withoutComponent'],
          },
        },
      },

      {
        $unwind: {
          path: '$combinedResults',
        },
      },
      {
        $replaceRoot: {
          newRoot: '$combinedResults',
        },
      },
      {
        $match: {
          ingredient_id: {
            $eq: new mongoose.Types.ObjectId(ingredient_id),
          },
        },
      },
    ];
    console.log('pipeline', recipeIdArray, ingredient_id);
    return await this.recipeModel.aggregate(pipeline);
  }
}
