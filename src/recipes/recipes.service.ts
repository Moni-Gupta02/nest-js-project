/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { PriceUpdateService } from 'src/common/utils/helper';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { DuplicateRecipeDTO, UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeDocument } from './schemas/recipe.schema';
import { RecipeRatingDocument } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { message } from 'src/common/assets';
import { HistoryService } from 'src/history/history.service';
import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import {
  handleUnexpectedError,
  convertToObjectId,
} from 'src/common/utils/utils';
import * as moment from 'moment-timezone';
import { ComponentDocument } from 'src/component/Schemas/component.schema';
import { PackagingMaterialDocument } from 'src/packaging-material/Schemas/packaging-material.entity';
@Injectable()
export class RecipesService {
  constructor(
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('Dump_Recipes')
    private readonly dumpRecipesModel: Model<DumpRecipesDocument>,
    @InjectModel('Rating')
    private readonly recipeRatingModel: Model<RecipeRatingDocument>,
    @InjectModel('Delivery')
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('PackagingMaterial')
    private readonly packagingMaterialModel: Model<PackagingMaterialDocument>,
    private readonly priceUpdateService: PriceUpdateService,
    private readonly historyService: HistoryService,
  ) {}

  async create(createRecipeDto: CreateRecipeDto): Promise<RecipeDocument> {
    try {
      // const recipeData =
      // await this.priceUpdateService.getRecipeUpdatedComposition(
      //   createRecipeDto,
      // );

      const createdIngredient = await this.recipeModel.create({
        ...createRecipeDto,
        ...(createRecipeDto?.cuisine && {
          cuisine: new mongoose.Types.ObjectId(createRecipeDto?.cuisine),
          is_active: true,
        }),
        status: 'draft',
      });

      return createdIngredient;
    } catch (error) {
      console.error('Error Recipe Create details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async findAll(
    dish_name?: string,
    category_type?: string,
    meal_category?: any,
    protein_size?: string[],
    protein_category?: string[],
    page: any = 1,
    limit: any = 0,
    sort: string = 'createdAt',
    order: any = -1,
    is_live?: string,
  ) {
    try {
      // 1. Sanitization & Type Casting
      const safePage = Math.max(1, parseInt(page) || 1);
      const safeLimit = parseInt(limit) || 0;
      const safeOrder = parseInt(order) === 1 ? 1 : -1;
      const skip = (safePage - 1) * safeLimit;

      const query: any = { is_active: true };

      if (dish_name) query.dish_name = { $regex: dish_name, $options: 'i' };
      if (is_live === 'true') query.is_live = true;
      if (is_live === 'false') query.is_live = false;
      if (category_type) query.category_type = category_type;

      // Handle Meal Category Array
      const mealCats = Array.isArray(meal_category)
        ? meal_category
        : meal_category
          ? [meal_category]
          : [];
      if (mealCats.length) {
        query.meal_category = {
          $in: mealCats.map((item) => new RegExp(item, 'i')),
        };
      }

      if (protein_size?.length) query.protein_size = { $in: protein_size };
      if (protein_category?.length)
        query.protein_category = { $in: protein_category };

      const pipeline: any[] = [
        { $match: query },
        { $sort: { [sort]: safeOrder } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              // Apply pagination early to minimize lookup work
              ...(safeLimit > 0
                ? [{ $skip: skip }, { $limit: safeLimit }]
                : []),

              // 2. Optimized Rating Lookup (Runs only on 10-20 items)
              {
                $lookup: {
                  from: 'ratings',
                  localField: '_id',
                  foreignField: 'recipe_id',
                  as: 'ratingDocs',
                },
              },

              // 3. Optimized Menu Lookup
              // We use a simple lookup and filter in memory/projection instead of nested unwind/group
              {
                $lookup: {
                  from: 'recipe_menus',
                  localField: '_id',
                  foreignField: 'recipe.recipe_id',
                  as: 'rawMenuData',
                },
              },

              {
                $project: {
                  dish_name: 1,
                  description: 1,
                  category_type: 1,
                  cuisine: 1,
                  is_active: 1,
                  status: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  meal_category: 1,
                  is_live: 1,
                  protein_size: 1,
                  dish_type: 1,
                  composition: 1,
                  calculated_price: 1,
                  calculated_weight: 1,
                  price: 1,
                  protein_category: {
                    $cond: {
                      if: { $isArray: '$protein_category' },
                      then: '$protein_category',
                      else: [{ $ifNull: ['$protein_category.category', null] }],
                    },
                  },
                  // Efficient Average Rating
                  average_rating: { $avg: '$ratingDocs.rating' },

                  // Efficient Menu Data mapping
                  menu_data: {
                    $map: {
                      input: '$rawMenuData',
                      as: 'm',
                      in: {
                        menu_id: '$$m._id',
                        menu_name: '$$m.name',
                        // Find the specific type from the menu's recipe array
                        variant: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: {
                                  $filter: {
                                    input: '$$m.recipe',
                                    as: 'r',
                                    cond: { $eq: ['$$r.recipe_id', '$_id'] },
                                  },
                                },
                                as: 'found',
                                in: '$$found.type',
                              },
                            },
                            0,
                          ],
                        },
                      },
                    },
                  },
                },
              },
              {
                $addFields: {
                  menu_data_count: { $size: '$menu_data' },
                },
              },
            ],
          },
        },
      ];

      const [result] = await this.recipeModel
        .aggregate(pipeline)
        .allowDiskUse(true);

      const totalRecipes = result.metadata[0]?.total || 0;
      const recipes = result.data || [];

      return {
        list: recipes,
        totalRecipes,
        currentPage: safePage,
        totalPages: safeLimit > 0 ? Math.ceil(totalRecipes / safeLimit) : 1,
      };
    } catch (error) {
      console.error('Error Recipe findAll details:', error);
      throw error;
    }
  }

  async findAllRecipeList(
    dish_name?: string,
    category_type?: string,
    meal_category?: any,
    protein_size?: string[],
    protein_category?: string[],
    page: any = 1,
    limit: any = 0,
    sort: string = 'createdAt',
    order: any = -1,
    is_live?: string,
  ) {
    try {
      // 1. Force numeric types to avoid MongoDB $limit string errors
      const safePage = Math.max(1, parseInt(page) || 1);
      const safeLimit = parseInt(limit) || 0;
      const safeOrder = parseInt(order) === 1 ? 1 : -1;
      const skip = (safePage - 1) * safeLimit;

      // 2. Build Query
      const query: any = { is_active: true };

      if (dish_name) query.dish_name = { $regex: dish_name, $options: 'i' };
      if (is_live === 'true') query.is_live = true;
      if (is_live === 'false') query.is_live = false;
      if (category_type) query.category_type = category_type;

      const mealCats = Array.isArray(meal_category)
        ? meal_category
        : meal_category
          ? [meal_category]
          : [];
      if (mealCats.length) {
        query.meal_category = {
          $in: mealCats.map((item) => new RegExp(item, 'i')),
        };
      }

      if (protein_size?.length) query.protein_size = { $in: protein_size };
      if (protein_category?.length)
        query.protein_category = { $in: protein_category };

      // 3. Single-Pass Aggregation
      const pipeline: any[] = [
        { $match: query },
        { $sort: { [sort]: safeOrder } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              ...(safeLimit > 0
                ? [{ $skip: skip }, { $limit: safeLimit }]
                : []),
              {
                $project: {
                  _id: 1,
                  dish_name: 1,
                  description: 1,
                  category_type: 1,
                  cuisine: 1,
                  is_active: 1,
                  status: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  meal_category: 1,
                  is_live: 1,
                  dish_type: 1,
                },
              },
            ],
          },
        },
      ];

      const [result] = await this.recipeModel
        .aggregate(pipeline)
        .allowDiskUse(true);

      const totalRecipes = result?.metadata[0]?.total || 0;
      const recipes = result?.data || [];

      // 4. Clean Output (Same as before)
      return {
        list: recipes,
        totalRecipes,
        currentPage: safePage,
        totalPages: safeLimit > 0 ? Math.ceil(totalRecipes / safeLimit) : 1,
      };
    } catch (error) {
      console.error('Error Recipe findAll details:', error);
      throw error;
    }
  }
  async update(
    user: any,
    recipeId: string,
    updateRecipe: UpdateRecipeDto,
  ): Promise<any> {
    try {
      const checkRecipe = await this.recipeModel.findOne(
        { _id: new mongoose.Types.ObjectId(recipeId), category_type: 'NDD' },
        { category_type: 1, _id: 0, composition: 1, price: 1 },
      );

      if (checkRecipe && updateRecipe?.is_live) {
        checkRecipe?.price?.map((priceItm) => {
          if (priceItm?.price <= 0) {
            throw new HttpException(
              {
                message:
                  message.recipe.RECIPE_PRICE_ERROR +
                  ' ' +
                  priceItm?.protein_type,
                status: false,
                data: null,
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        });
      }

      const checkAllIngredientsActive: any = await this.recipeModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(recipeId),
          },
        },
        {
          $graphLookup: {
            from: 'components',
            startWith: '$composition.component_id',
            connectFromField: 'composition.component_id',
            connectToField: '_id',
            as: 'directComponent',
            maxDepth: 10,
          },
        },
        {
          $unwind: {
            path: '$directComponent',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$directComponent.composition',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'ingredients',
            localField: 'directComponent.composition.ingredient_id',
            foreignField: '_id',
            as: 'finalDataForComponent',
          },
        },
        {
          $unwind: {
            path: '$finalDataForComponent',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            'finalDataForComponent.is_active': false, // Filter only inactive ingredients
          },
        },
        {
          $group: {
            _id: '$_id',
            dish_name: { $first: '$dish_name' },
            composition: { $first: '$composition' },
            finalDataForComponent: {
              $push: {
                is_active: '$finalDataForComponent.is_active',
                ingredient_name: '$finalDataForComponent.name',
                component_name: '$directComponent.name',
              },
            },
          },
        },
        {
          $project: {
            dish_name: 1,
            // directComponent: 1,
            finalDataForComponent: 1,
          },
        },
      ]);

      if (checkAllIngredientsActive?.[0]?.finalDataForComponent?.length > 0) {
        throw new HttpException(
          {
            message:
              [
                ...new Set(
                  checkAllIngredientsActive?.[0]?.finalDataForComponent?.map(
                    (finalCmp) => finalCmp?.ingredient_name,
                  ) || [],
                ),
              ]?.join(', ') +
              ' ingredients are inactive in these ' +
              [
                ...new Set(
                  checkAllIngredientsActive?.[0]?.finalDataForComponent?.map(
                    (finalCmp) => finalCmp?.component_name,
                  ) || [],
                ),
              ]?.join(', ') +
              ' components',
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const recipeData =
        await this.priceUpdateService.getRecipeUpdatedComposition(
          updateRecipe,
          recipeId,
        );

      await this.recipeModel.updateOne(
        {
          _id: new mongoose.Types.ObjectId(recipeId),
          $or: [
            { status: 'approved' },
            //  { status: 'not_approved' }
          ],
        },
        {
          $set: { status: 'finalized' },
        },
      );

      const UpdateRecipe = await this.recipeModel
        .findByIdAndUpdate(recipeId, recipeData, {
          new: false,
          returnOriginal: true,
        })
        .lean()
        .exec();
      const { before_changes, current_changes } =
        await this.historyService.getChangedFields(UpdateRecipe, updateRecipe);
      // console.log({ before_changes, current_changes });
      await this.historyService.createHistory(
        user,
        recipeId,
        'recipe',
        message.history.HISTORY_UPDATE,
        before_changes,
        current_changes,
      );
      // const previousRecipeData = await this.recipeModel.findById(recipeId);

      ////////////////////////////////////////////////////////////////
      //////   N - indicates a newly added property/element     //////
      //////   D - indicates a property/element was deleted     //////
      //////   E - indicates a property/element was edited      //////
      //////   A - indicates a change occurred within an array  //////
      ////////////////////////////////////////////////////////////////
      return {
        data: UpdateRecipe,
        message: message.recipe.RECIPE_UPDATED,
        status: true,
      };
    } catch (error) {
      console.error('Error Recipe update details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async updatePortioning(composition: any, recipe_id: string, user: string): Promise<any> {
    try {
      // Get recipe before update for admin history
      const recipeBefore = await this.recipeModel
        .findById(recipe_id)
        .lean()
        .exec();

      const portioning = await this.priceUpdateService.getUpdatePortioning(
        composition,
        // updateRecipePortioningDto.protein_type,
        // updateRecipePortioningDto.is_finalized || false,
        recipe_id,
      );
      const updatedPortioningData = await this.recipeModel
        .findOneAndUpdate(
          {
            _id: recipe_id,
          },
          {
            $set: portioning,
          },
          { new: true, returnOriginal: false },
        )
        .lean()
        .exec();

      await this.historyService.createHistory(
        'Portioning Update',
        user,
        recipe_id,
        recipeBefore,
        updatedPortioningData,
        { action: 'PORTIONING_UPDATE' },
      );
      await this.recipeModel
        .updateOne(
          {
            _id: new mongoose.Types.ObjectId(recipe_id),
            $or: [
              { status: 'approved' },
              //  { status: 'not_approved' }
            ],
          },
          {
            $set: { status: 'finalized' },
          },
        )
        .lean()
        .exec();

      // Compute only the changed fields using historyService
      const { before_changes, current_changes } =
        await this.historyService.getChangedFields(
          recipeBefore,
          updatedPortioningData,
        );

      return {
        data: updatedPortioningData,
        before_changes,
        current_changes,
      };
    } catch (error) {
      console.error('Error  recipe updatePortioning details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      const recipe = await this.recipeModel
        .findById(id)
        .populate({
          path: 'composition',
          populate: [
            {
              path: 'component_id',
              model: 'Component',
            },
          ],
        })
        .exec();

      const avergaeRecipeRating = await this.recipeRatingModel.aggregate([
        {
          $match: {
            recipe_id: new mongoose.Types.ObjectId(id),
            rating: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: '$recipe_id',
            average_rating: {
              $avg: '$rating',
            },
          },
        },
      ]);
      console.log('averageRecipeRating', avergaeRecipeRating);

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      const subRecipes = await this.recipeModel
        .aggregate([
          {
            $match: {
              _id: new mongoose.Types.ObjectId(id),
            },
          },
          {
            $unwind: {
              path: '$composition',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              componentId: '$composition.component_id',
              ingredientId: '$composition.ingredient_id',
              packageMaterialIds: '$composition.packaging_material',
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
              packageMaterialIds: 1,
            },
          },
          {
            $group: {
              _id: null,
              componentIds: {
                $addToSet: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $ne: ['$componentId', null],
                        },
                        {
                          $ne: ['$componentId', ''],
                        },
                      ],
                    },
                    then: '$componentId',
                    else: null,
                  },
                },
              },
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
                    then: '$ingredientId',
                    else: null,
                  },
                },
              },
              packageMaterialIds: {
                $addToSet: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $ne: ['$packageMaterialIds', null],
                        },
                        {
                          $ne: ['$packageMaterialIds', ''],
                        },
                      ],
                    },
                    then: '$packageMaterialIds',
                    else: null,
                  },
                },
              },
            },
          },
          {
            $project: {
              componentIds: {
                $filter: {
                  input: '$componentIds',
                  as: 'componentId',
                  cond: {
                    $ne: ['$$componentId', null],
                  },
                },
              },
              ingredientIds: {
                $filter: {
                  input: '$ingredientIds',
                  as: 'ingredientId',
                  cond: {
                    $ne: ['$$ingredientId', null],
                  },
                },
              },
              packageMaterialIds: {
                $filter: {
                  input: '$packageMaterialIds',
                  as: 'packageMaterialIds',
                  cond: {
                    $ne: ['$$packageMaterialIds', null],
                  },
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              componentIds: 1,
              ingredientIds: 1,
              packageMaterialIds: 1,
            },
          },
        ])
        .exec();
      const recipeManu = await this.recipeModel.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: 'recipe_menus',
            let: {
              recipeId: '$_id',
            },
            pipeline: [
              {
                $unwind: {
                  path: '$recipe',
                },
              },
              {
                $group: {
                  _id: '$recipe.recipe_id',
                  menu: {
                    $push: {
                      menu_id: '$_id',
                      menu_name: '$name',
                      variant: '$recipe.type',
                      startDate: '$startDate',
                      endDate: '$endDate',
                    },
                  },
                },
              },
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$recipeId'],
                  },
                },
              },
            ],
            as: 'menuData',
          },
        },
        {
          $project: {
            menu_data: {
              $cond: {
                if: { $gt: [{ $size: '$menuData' }, 0] },
                then: { $arrayElemAt: ['$menuData.menu', 0] },
                else: [],
              },
            },
          },
        },
      ]);

      // Calculate average rating for each menu individually
      const menuData = recipeManu?.[0]?.menu_data || [];
      const menuDataWithRatings = await Promise.all(
        menuData.map(async (menu) => {
          const ratingData = await this.recipeRatingModel.aggregate([
            {
              $match: {
                recipe_id: new mongoose.Types.ObjectId(id),
                rating: { $gt: 0 },
                delivery_date: {
                  $gte: new Date(menu.startDate),
                  $lte: new Date(menu.endDate),
                },
              },
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalRatings: { $sum: 1 },
              },
            },
          ]);

          return {
            ...menu,
            averageRating: ratingData?.[0]?.averageRating
              ? Math.round(ratingData[0].averageRating * 100) / 100
              : null,
            totalRatings: ratingData?.[0]?.totalRatings || 0,
          };
        }),
      );

      console.log('subRecipes', subRecipes);
      return {
        ...recipe?.toObject(),
        subRecipes: subRecipes[0]?.componentIds || [],
        Ingredients: subRecipes[0]?.ingredientIds || [],
        packageMaterials: subRecipes[0]?.packageMaterialIds || [],
        average_rating: avergaeRecipeRating?.[0]?.average_rating,
        recipe_manu: menuDataWithRatings,
      };
    } catch (error) {
      console.error('Error recipe findOne details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async remove(id: string) {
    console.log('Removing', id);
    return await this.recipeModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(id),
      },
      { $set: { is_active: false } },
    );
  }

  async duplicate(duplicateRecipeDTO: DuplicateRecipeDTO) {
    try {
      const recipeDocument: any = await this.recipeModel
        .findOne({
          _id: new mongoose.Types.ObjectId(duplicateRecipeDTO?.id),
        })
        .sort('-createdAt');
      if (recipeDocument) {
        const recipeData = recipeDocument?.toObject();

        await checkNameRecursively(this.recipeModel, recipeData);
        delete recipeData['_id'];
        delete recipeData['updatedAt'];
        delete recipeData['createdAt'];
        const duplicateRecipe: any = await this.recipeModel.create(recipeData);

        return duplicateRecipe;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error recipe duplicate details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async migratePackagingMaterialToPortioningBalance(
    recipeId: string,
  ): Promise<any> {
    try {
      // Validate recipe_id
      if (!recipeId || !mongoose.Types.ObjectId.isValid(recipeId)) {
        throw new HttpException(
          {
            message: 'Invalid recipe ID provided',
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Fetch recipe with composition
      const recipe = await this.recipeModel.findById(
        new mongoose.Types.ObjectId(recipeId),
      );

      if (!recipe) {
        throw new HttpException(
          {
            message: 'Recipe not found',
            status: false,
            data: null,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      let updatedCount = 0;
      let totalPortioningBalance = 0;
      const updatedComposition = [];
      const packagingMaterialIdsToFetch = new Set<string>();

      // First pass: Collect all packaging_material IDs that need material lookup
      if (recipe.composition && Array.isArray(recipe.composition)) {
        for (const comp of recipe.composition) {
          const compositionPackagingMaterial = comp.packaging_material;

          // If composition has packaging_material, we might need to fetch its name for portioning_balance
          if (compositionPackagingMaterial) {
            const packId =
              compositionPackagingMaterial instanceof mongoose.Types.ObjectId
                ? compositionPackagingMaterial.toString()
                : compositionPackagingMaterial?.toString();
            if (packId) {
              packagingMaterialIdsToFetch.add(packId);
            }
          }

          // Check portioning_balance for missing materials
          if (
            comp.portioning_balance &&
            Array.isArray(comp.portioning_balance)
          ) {
            for (const portion of comp.portioning_balance) {
              if (portion.packaging_material) {
                const portionPackId =
                  portion.packaging_material instanceof mongoose.Types.ObjectId
                    ? portion.packaging_material.toString()
                    : portion.packaging_material?.toString();
                if (portionPackId) {
                  packagingMaterialIdsToFetch.add(portionPackId);
                }
              }
            }
          }
        }
      }

      // Batch fetch all packaging materials that need name lookup
      const packagingMaterialMap = new Map<string, string>();
      if (packagingMaterialIdsToFetch.size > 0) {
        const packagingMaterials = await this.packagingMaterialModel.find(
          {
            _id: {
              $in: Array.from(packagingMaterialIdsToFetch).map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
          },
          { _id: 1, name: 1 },
        );

        packagingMaterials.forEach((pm) => {
          if (pm._id && pm.name) {
            packagingMaterialMap.set(pm._id.toString(), pm.name);
          }
        });
      }

      // Second pass: Process each composition and update portioning_balance
      if (recipe.composition && Array.isArray(recipe.composition)) {
        for (const comp of recipe.composition) {
          // Get all fields from composition level
          const compositionPackagingMaterial = comp.packaging_material;
          const compositionDescription = comp.description;
          const compositionInstruction = comp.instruction;
          const compositionIsMain = comp.is_main;
          const compositionIsInside = comp.is_inside;
          const compositionIsSeparate = comp.is_separate;

          // Process even if composition doesn't have packaging_material
          // We'll still update other fields (is_main, is_inside, is_separate, description, instruction)

          // Get material from PackagingMaterial for composition level (to use as fallback)
          const compositionPackId =
            compositionPackagingMaterial instanceof mongoose.Types.ObjectId
              ? compositionPackagingMaterial.toString()
              : compositionPackagingMaterial?.toString();
          const compositionMaterialName = compositionPackId
            ? packagingMaterialMap.get(compositionPackId) || null
            : null;

          // Process portioning_balance
          if (
            comp.portioning_balance &&
            Array.isArray(comp.portioning_balance)
          ) {
            const updatedPortioningBalance = [];

            for (const portion of comp.portioning_balance) {
              totalPortioningBalance++;

              // Always update packaging_material from composition level (if available)
              const packagingMaterialId = compositionPackagingMaterial
                ? compositionPackagingMaterial instanceof
                  mongoose.Types.ObjectId
                  ? compositionPackagingMaterial
                  : compositionPackagingMaterial?.toString()
                    ? new mongoose.Types.ObjectId(
                        compositionPackagingMaterial.toString(),
                      )
                    : null
                : null;

              // Get material - fetch from PackagingMaterial if missing or blank
              let portionMaterial = portion.material;
              if (!portionMaterial || portionMaterial.trim() === '') {
                // Priority 1: Try to get from portion's packaging_material
                if (portion.packaging_material) {
                  const portionPackId =
                    portion.packaging_material instanceof
                    mongoose.Types.ObjectId
                      ? portion.packaging_material.toString()
                      : portion.packaging_material?.toString();
                  if (
                    portionPackId &&
                    packagingMaterialMap.has(portionPackId)
                  ) {
                    portionMaterial = packagingMaterialMap.get(portionPackId);
                  }
                }
                // Priority 2: Fallback to composition's packaging material name
                if (
                  (!portionMaterial || portionMaterial.trim() === '') &&
                  compositionMaterialName
                ) {
                  portionMaterial = compositionMaterialName;
                }
                // Priority 3: If composition has packaging_material, fetch its name
                if (
                  (!portionMaterial || portionMaterial.trim() === '') &&
                  packagingMaterialId
                ) {
                  const compPackId = packagingMaterialId.toString();
                  if (packagingMaterialMap.has(compPackId)) {
                    portionMaterial = packagingMaterialMap.get(compPackId);
                  }
                }
              }

              // Forcefully update all 7 fields in portioning_balance
              const updatedPortion = {
                ...portion,
                // Always update packaging_material from composition (forcefully, even if null)
                packaging_material: packagingMaterialId || null,
                // Always update material (from PackagingMaterial if needed)
                material: portionMaterial || '',
                // Always update description from composition
                description: compositionDescription || '',
                // Always update instruction from composition
                instruction: compositionInstruction || '',
                // Always update is_main from composition
                is_main:
                  compositionIsMain !== undefined ? compositionIsMain : false,
                // Always update is_inside from composition
                is_inside:
                  compositionIsInside !== undefined
                    ? compositionIsInside
                    : false,
                // Always update is_separate from composition
                is_separate:
                  compositionIsSeparate !== undefined
                    ? compositionIsSeparate
                    : false,
              };
              updatedPortioningBalance.push(updatedPortion);
              updatedCount++;
            }

            // Update composition with new portioning_balance
            updatedComposition.push({
              ...comp,
              portioning_balance: updatedPortioningBalance,
            });
          } else {
            // No portioning_balance, keep composition as is
            updatedComposition.push(comp);
          }
        }

        // Update recipe with migrated data
        await this.recipeModel.findByIdAndUpdate(
          new mongoose.Types.ObjectId(recipeId),
          {
            $set: {
              composition: updatedComposition,
            },
          },
          { new: true },
        );

        return {
          message: 'Packaging material migration completed successfully',
          data: {
            recipe_id: recipeId,
            recipe_name: recipe.dish_name,
            total_compositions: recipe.composition?.length || 0,
            total_portioning_balance: totalPortioningBalance,
            updated_portioning_balance: updatedCount,
            skipped: totalPortioningBalance - updatedCount,
          },
          status: true,
        };
      } else {
        return {
          message: 'No composition found in recipe',
          data: {
            recipe_id: recipeId,
            recipe_name: recipe.dish_name,
          },
          status: true,
        };
      }
    } catch (error) {
      console.error('Error in packaging material migration:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: `Migration failed: ${error.message}`,
          status: false,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async batchMigratePackagingMaterialToPortioningBalance(
    recipeIds: string[],
  ): Promise<any> {
    try {
      // Validate input
      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        throw new HttpException(
          {
            message: 'Please provide an array of recipe IDs',
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate all recipe IDs
      const invalidIds = recipeIds.filter(
        (id) => !id || !mongoose.Types.ObjectId.isValid(id),
      );
      if (invalidIds.length > 0) {
        throw new HttpException(
          {
            message: `Invalid recipe IDs found: ${invalidIds.join(', ')}`,
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const results = {
        total: recipeIds.length,
        successful: 0,
        failed: 0,
        details: [] as any[],
      };

      // Process each recipe one by one (sequentially for migration safety)
      for (const recipeId of recipeIds) {
        try {
          const result =
            await this.migratePackagingMaterialToPortioningBalance(recipeId);
          results.successful++;
          results.details.push({
            recipe_id: recipeId,
            status: 'success',
            ...result.data,
          });
        } catch (error) {
          results.failed++;
          const errorMessage =
            error instanceof HttpException
              ? error.getResponse()['message'] || error.message
              : error.message || 'Unknown error';
          results.details.push({
            recipe_id: recipeId,
            status: 'failed',
            error: errorMessage,
          });
          // Continue processing other recipes even if one fails
          console.error(
            `Migration failed for recipe ${recipeId}:`,
            errorMessage,
          );
        }
      }

      return {
        message: `Batch migration completed. ${results.successful} successful, ${results.failed} failed out of ${results.total} recipes`,
        data: results,
        status: true,
      };
    } catch (error) {
      console.error('Error in batch packaging material migration:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: `Batch migration failed: ${error.message}`,
          status: false,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async makeWeeklyLiveRecipe() {
    try {
      await this.recipeModel.updateMany(
        {
          category_type: 'subscription',
        },
        { $set: { is_live: false } },
      );

      // const formattedDate = new Date(
      //   moment(new Date())
      //     .utcOffset(0, true)
      //     .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
      //     .toDate(),
      // );

      // const date = await getBetweenDay(formattedDate);
      const recipeData = await this.dumpRecipesModel
        .findOne({})
        .sort({ date: -1 })
        .limit(1);
      await Promise.all(
        recipeData.recipes.map(async (recipe) => {
          await this.recipeModel.updateOne(
            {
              _id: recipe.recipe_id,
            },
            { $set: { is_live: true } },
          );
        }),
      );
    } catch (error) {
      console.error('Error recipe duplicate details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }
  async getRecipeWiseRating(
    startDate: string,
    endDate: string,
    // search?: string,
    page: string = '1',
    limit: string = '0',
    sort: string = 'rating',
    order: string = '1', /// 1 for ascending, -1 for descending
    diet_type?: string,
    variant?: string,
    recipe_id?: string,
    rating?: string,
    review?: string,
    comment?: string,
  ): Promise<any> {
    try {
      const matchConditions: Record<string, any> = {}; // Define matchConditions with a flexible type

      if (recipe_id) {
        matchConditions.$or = [
          {
            'delivery_item.selected_meal.recipe_id':
              new mongoose.Types.ObjectId(recipe_id),
          },
          { 'delivery_item.selected_meal.recipe_id': recipe_id },
        ];
      }

      if (diet_type && diet_type !== '') {
        // Add diet_type condition dynamically
        matchConditions[
          'delivery_item.selected_meal.variants.protein_category'
        ] = diet_type;
      }
      if (variant && variant !== '') {
        matchConditions['delivery_item.selected_meal.variants.protein_option'] =
          variant;
      }
      console.log('matchConditions', matchConditions);

      const matchRatingConditions = {};
      if (rating && rating !== '') {
        const ratingArr = rating.split(',').map(Number);
        matchRatingConditions['rating'] = { $in: ratingArr }; // Ensures the array exists and is not empty
      }
      if (review === 'yes') {
        matchRatingConditions['review'] = { $exists: true, $ne: [] }; // Ensures the array exists and is not empty
      } else if (review === 'no') {
        matchRatingConditions['review'] = { $size: 0 }; // Matches documents where review is an empty array
      }
      if (comment === 'yes') {
        matchRatingConditions['comment'] = { $exists: true, $ne: '' }; // Ensures the array exists and is not empty
      } else if (comment === 'no') {
        matchRatingConditions['comment'] = { $eq: '' }; // Matches documents where comment is an empty array
      }

      console.log('matchRatingConditions', matchRatingConditions, startDate); // Output: [1, 2, 3, 4]

      const pipeline: any[] = [
        {
          $match: {
            delivery_date: {
              $gte: new Date(
                moment(startDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(endDate)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
            delivery_type: 'subscription',
            not_deliverable: false,
            is_delivery_freezed: false,
            'delivery_item.selected_meal.rating_id': {
              $exists: true,
            },
          },
        },
        {
          $unwind: {
            path: '$delivery_item',
          },
        },
        {
          $match: matchConditions,
        },
        {
          $match: {
            'delivery_item.selected_meal.rating_id': {
              $exists: true,
            },
          },
        },
        {
          $lookup: {
            from: 'ratings',
            localField: 'delivery_item.selected_meal.rating_id',
            foreignField: '_id',
            as: 'ratingData',
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
          $project: {
            customer_name: {
              $concat: [
                {
                  $arrayElemAt: ['$customerData.first_name', 0],
                },
                ' ',
                {
                  $arrayElemAt: ['$customerData.last_name', 0],
                },
              ],
            },
            rating: {
              $arrayElemAt: ['$ratingData.rating', 0],
            },
            review: {
              $arrayElemAt: ['$ratingData.review', 0],
            },
            comment: {
              $arrayElemAt: ['$ratingData.comment', 0],
            },
            recipe_id: 1,
            customer_id: 1,
            dish_name: '$delivery_item.selected_meal.dish_name',
            meal_category: '$delivery_item.selected_meal.meal_category',
            variants: '$delivery_item.selected_meal.variants.protein_option',
            protein_category:
              '$delivery_item.selected_meal.variants.protein_category',
            delivery_date: 1,
            meal_size: '$delivery_item.selected_meal.variants.size',
          },
        },
        {
          $match: matchRatingConditions,
        },
      ];

      if (!recipe_id || recipe_id === '') {
        pipeline.push({
          $group: {
            _id: '$dish_name',
            data: {
              $push: '$$ROOT',
            },
          },
        });
      }

      // console.log('pipeline', pipeline);
      if (page && +limit > 0) {
        // Add sorting and pagination using $facet
        const skip = (+page - 1) * +limit;
        pipeline.push({
          $facet: {
            metadata: [
              { $count: 'total' }, // Count total documents matching the filter
            ],
            paginatedData: [
              { $sort: { [sort]: +order } }, // Sort
              { $skip: skip }, // Skip documents for pagination
              { $limit: +limit }, // Limit documents per page
            ],
          },
        });
      }

      const response = await this.deliveryModel.aggregate(pipeline);

      const total = response?.[0]?.metadata?.[0]?.total || response.length;
      const paginatedData = response?.[0]?.paginatedData || response;
      return {
        list: paginatedData,
        totalRecords: total,
        currentPage: +page,
        totalPages: +limit > 0 ? Math.ceil(total / +limit) : 1,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}

const copyRecipeFunction = async (recipeData: any) => {
  try {
    if (
      recipeData?.dish_name?.includes('(') &&
      recipeData?.dish_name?.includes(')')
    ) {
      const duplicateCount =
        parseInt(
          recipeData?.dish_name?.split('(Copy ')?.[1]?.split(')')?.[0]?.trim(),
        ) + 1;
      recipeData.dish_name =
        recipeData?.dish_name?.split('(')?.[0] + `(Copy ${duplicateCount})`;
    } else {
      recipeData.dish_name = recipeData?.dish_name + '(Copy 1)';
    }
    return recipeData;
  } catch (error) {
    console.error('Error recipe copyRecipeFunction details:', error);
    throw error; // Rethrow the error to be caught by the caller
  }
};

const checkSameNameRecipe = async (recipeModel: any, recipeData: any) => {
  return await recipeModel.findOne({
    dish_name: recipeData?.dish_name,
  });
};

const checkNameRecursively = async (recipeModel: any, recipeData: any) => {
  try {
    recipeData = await copyRecipeFunction(recipeData);
    const sameNameRecipe = await checkSameNameRecipe(recipeModel, recipeData);
    if (sameNameRecipe) {
      recipeData = await checkNameRecursively(recipeModel, recipeData);
    }
    return recipeData;
  } catch (error) {
    console.error('Error recipe checkNameRecursively details:', error);
    throw error; // Rethrow the error to be caught by the caller
  }
};
