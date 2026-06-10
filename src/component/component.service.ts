import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { PriceUpdateService } from 'src/common/utils/helper';
import {
  CreateComponentDto,
  DuplicateComponentDTO,
} from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { ComponentDocument } from './Schemas/component.schema';
import { HistoryService } from 'src/history/history.service';

@Injectable()
export class ComponentService {
  constructor(
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    private readonly priceUpdateService: PriceUpdateService,
    private readonly historyService: HistoryService,
  ) {}
  async create(createComponentDto: CreateComponentDto) {
    const createComponentData = await this.componentModel.create({
      ...createComponentDto,
      is_active: true,
    });

    return createComponentData;
  }

  async findAll(
    search?: string,
    page: any = 1,
    limit: any = 0, // Keeps your default
    sort: string = 'createdAt',
    order: any = -1,
    recipe_type?: string,
  ): Promise<any> {
    // 1. Internal Type Fixing (Fixes the MongoServerError: invalid argument to $limit)
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = parseInt(limit) || 0;
    const safeOrder = parseInt(order) === 1 ? 1 : -1;
    const skip = (safePage - 1) * safeLimit;

    const query: any = {
      is_active: true,
      ...(recipe_type && { recipe_type: recipe_type }),
    };

    if (search) {
      query.name = { $regex: new RegExp(search, 'i') };
    }

    try {
      const pipeline: any[] = [
        { $match: query },
        { $sort: { [sort]: safeOrder } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              // Apply pagination inside facet for speed
              ...(safeLimit > 0
                ? [{ $skip: skip }, { $limit: safeLimit }]
                : []),
              {
                $graphLookup: {
                  from: 'components',
                  startWith: '$_id',
                  connectFromField: 'composition.component_id',
                  connectToField: '_id',
                  as: 'sub_recipe_list',
                  maxDepth: 10,
                },
              },
              {
                $graphLookup: {
                  from: 'recipes_details',
                  startWith: '$sub_recipe_list._id',
                  connectFromField: '_id',
                  connectToField: 'composition.component_id',
                  as: 'recipe_list',
                  maxDepth: 10,
                },
              },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  description: 1,
                  is_active: 1,
                  recipe_type: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  calculated_price: 1,
                  calculated_weight: 1,
                  manual_weight: 1,
                  // KEEPING EXACT SAME LOGIC FOR 'price'
                  price: {
                    $round: [
                      {
                        $divide: [
                          {
                            $multiply: [
                              { $ifNull: ['$calculated_price', 0] },
                              100,
                            ],
                          },
                          {
                            $cond: [
                              {
                                $or: [
                                  { $eq: ['$use_calculated_weight', true] },
                                  { $lte: ['$manual_weight', 0] },
                                ],
                              },
                              {
                                $cond: [
                                  { $eq: ['$calculated_weight', 0] },
                                  1,
                                  '$calculated_weight',
                                ],
                              },
                              '$manual_weight',
                            ],
                          },
                        ],
                      },
                      2,
                    ],
                  },
                  // KEEPING EXACT SAME ARRAY STRUCTURE
                  sub_recipe_list: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$sub_recipe_list',
                          as: 's',
                          cond: { $ne: ['$$s._id', '$_id'] },
                        },
                      },
                      as: 's',
                      in: { _id: '$$s._id', name: '$$s.name' },
                    },
                  },
                  recipe_list: {
                    $map: {
                      input: '$recipe_list',
                      as: 'r',
                      in: { _id: '$$r._id', dish_name: '$$r.dish_name' },
                    },
                  },
                },
              },
            ],
          },
        },
      ];

      const [result] = await this.componentModel
        .aggregate(pipeline)
        .allowDiskUse(true);

      const totalcomponents = result?.metadata[0]?.total || 0;
      const components = result?.data || [];

      let totalPages = 0;
      if (safeLimit > 0) {
        totalPages = Math.ceil(totalcomponents / safeLimit);
      }

      // Returning exact same keys so frontend doesn't break
      return {
        list: components,
        totalcomponents,
        currentPage: safePage,
        totalPages,
      };
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string) {
    console.log('id for component', id);
    const query = {
      _id: new mongoose.Types.ObjectId(id),
      // recipe_type: 'component',
      is_active: true,
    };
    // const pipeline: any[] = [
    //   {
    //     $match: query,
    //   },
    //   {
    //     $graphLookup: {
    //       from: 'components',
    //       startWith: '$_id',
    //       connectFromField: 'composition.component_id',
    //       connectToField: '_id',
    //       as: 'sub_recipe_list',
    //       maxDepth: 10,
    //       depthField: 'level',
    //     },
    //   },
    //   {
    //     $graphLookup: {
    //       from: 'recipes_details',
    //       startWith: {
    //         $map: {
    //           input: '$sub_recipe_list',
    //           as: 'comp',
    //           in: '$$comp._id',
    //         },
    //       },
    //       connectFromField: '_id',
    //       connectToField: 'composition.component_id',
    //       as: 'recipe_list',
    //       maxDepth: 10,
    //     },
    //   },
    //   {
    //     $addFields: {
    //       sub_recipe_list: {
    //         $filter: {
    //           input: '$sub_recipe_list',
    //           as: 'subRecipe',
    //           cond: {
    //             $ne: ['$$subRecipe._id', new mongoose.Types.ObjectId(id)],
    //           },
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $project: {
    //       name: 1,
    //       description: 1,
    //       cooking_complexity: 1,
    //       useblefor_other: 1,
    //       is_frozen: 1,
    //       stockable: 1,
    //       highly_perishable: 1,
    //       final_dish_image: 1,
    //       is_active: 1,
    //       recipe_type: 1,
    //       use_calculated_weight: 1,
    //       allergens: 1,
    //       dish_tag: 1,
    //       createdAt: 1,
    //       updatedAt: 1,
    //       calculated_price: 1,
    //       calculated_weight: 1,
    //       composition: 1,
    //       manual_weight: 1,
    //       cooking_method: 1,
    //       price: {
    //         $round: [
    //           {
    //             $divide: [
    //               {
    //                 $multiply: ['$calculated_price', 100],
    //               },
    //               {
    //                 $cond: {
    //                   if: {
    //                     $or: [
    //                       { $eq: ['$use_calculated_weight', true] },
    //                       { $eq: ['$manual_weight', 0] },
    //                     ],
    //                   },
    //                   then: {
    //                     $cond: {
    //                       if: { $eq: ['$calculated_weight', 0] },
    //                       then: 1,
    //                       else: '$calculated_weight',
    //                     },
    //                   },
    //                   else: '$manual_weight',
    //                 },
    //               },
    //             ],
    //           },
    //           2,
    //         ],
    //       },
    //       sub_recipe_list: {
    //         _id: 1,
    //         name: 1,
    //       },
    //       recipe_list: {
    //         _id: 1,
    //         dish_name: 1,
    //       },
    //     },
    //   },
    // ];

    const pipeline: any[] = [
      {
        $match: query,
      },
      {
        $graphLookup: {
          from: 'components',
          startWith: '$_id',
          connectFromField: 'composition.component_id',
          connectToField: '_id',
          as: 'sub_recipe_list',
          maxDepth: 10,
          depthField: 'level',
        },
      },
      {
        $graphLookup: {
          from: 'recipes_details',
          startWith: {
            $map: {
              input: '$sub_recipe_list',
              as: 'comp',
              in: '$$comp._id',
            },
          },
          connectFromField: '_id',
          connectToField: 'composition.component_id',
          as: 'recipe_list',
          maxDepth: 10,
        },
      },
      {
        $addFields: {
          sub_recipe_list: '$sub_recipe_list',
          sub_recipe_id: '$_id',
          sub_recipe_list_new: {
            $filter: {
              input: '$sub_recipe_list',
              as: 'subRecipe',
              cond: {
                $ne: ['$$subRecipe._id', new mongoose.Types.ObjectId(id)],
              },
            },
          },
        },
      },
      {
        $unwind: {
          path: '$sub_recipe_list',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$sub_recipe_list.composition',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          sub_recipe_id: {
            $first: '$sub_recipe_id',
          },
          componentIds: {
            $addToSet: {
              $cond: {
                if: {
                  $and: [
                    {
                      $ne: ['$sub_recipe_list._id', null],
                    },
                    {
                      $ne: ['$sub_recipe_list._id', ''],
                    },
                  ],
                },
                then: '$sub_recipe_list._id',
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
                      $ne: ['$sub_recipe_list.composition.ingredient_id', null],
                    },
                    {
                      $ne: ['$sub_recipe_list.composition.ingredient_id', ''],
                    },
                  ],
                },
                then: '$sub_recipe_list.composition.ingredient_id',
                else: null,
              },
            },
          },
          name: {
            $first: '$name',
          },
          description: {
            $first: '$description',
          },
          cooking_complexity: {
            $first: '$cooking_complexity',
          },
          useblefor_other: {
            $first: '$useblefor_other',
          },
          is_frozen: {
            $first: '$is_frozen',
          },
          stockable: {
            $first: '$stockable',
          },
          highly_perishable: {
            $first: '$highly_perishable',
          },
          final_dish_image: {
            $first: '$final_dish_image',
          },
          is_active: {
            $first: '$is_active',
          },
          recipe_type: {
            $first: '$recipe_type',
          },
          use_calculated_weight: {
            $first: '$use_calculated_weight',
          },
          allergens: {
            $first: '$allergens',
          },
          dish_tag: {
            $first: '$dish_tag',
          },
          createdAt: {
            $first: '$createdAt',
          },
          updatedAt: {
            $first: '$updatedAt',
          },
          calculated_price: {
            $first: '$calculated_price',
          },
          calculated_weight: {
            $first: '$calculated_weight',
          },
          composition: {
            $first: '$composition',
          },
          manual_weight: {
            $first: '$manual_weight',
          },
          cooking_method: {
            $first: '$cooking_method',
          },
          sub_recipe_list: {
            $first: '$sub_recipe_list_new',
          },
          recipe_list: {
            $first: '$recipe_list',
          },
        },
      },
      {
        $project: {
          _id: '$sub_recipe_id',
          name: 1,
          description: 1,
          cooking_complexity: 1,
          useblefor_other: 1,
          is_frozen: 1,
          stockable: 1,
          highly_perishable: 1,
          final_dish_image: 1,
          is_active: 1,
          recipe_type: 1,
          use_calculated_weight: 1,
          allergens: 1,
          dish_tag: 1,
          createdAt: 1,
          updatedAt: 1,
          calculated_price: 1,
          calculated_weight: 1,
          composition: 1,
          manual_weight: 1,
          cooking_method: 1,
          price: {
            $round: [
              {
                $divide: [
                  {
                    $multiply: ['$calculated_price', 100],
                  },
                  {
                    $cond: {
                      if: {
                        $or: [
                          {
                            $eq: ['$use_calculated_weight', true],
                          },
                          {
                            $eq: ['$manual_weight', 0],
                          },
                        ],
                      },
                      then: {
                        $cond: {
                          if: {
                            $eq: ['$calculated_weight', 0],
                          },
                          then: 1,
                          else: '$calculated_weight',
                        },
                      },
                      else: '$manual_weight',
                    },
                  },
                ],
              },
              2,
            ],
          },
          sub_recipe_list: {
            _id: 1,
            name: 1,
          },
          recipe_list: {
            _id: 1,
            dish_name: 1,
          },
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
        },
      },
    ];

    const compositionData: any = await this.componentModel.aggregate(pipeline);

    return compositionData[0];
  }
  async update(id: string, updateComponentDto: UpdateComponentDto) {
    const updateSubRecipeData =
      await this.priceUpdateService.getUpdatedSubRecipeCompositionPrice(
        updateComponentDto,
      );

    const updateComponent = await this.componentModel
      .findByIdAndUpdate(id, updateSubRecipeData, {
        new: false,
        returnOriginal: true,
        // returnOriginal: true,
      })
      .lean()
      .exec();

    const { before_changes, current_changes } =
      await this.historyService.getChangedFields(
        updateComponent,
        updateSubRecipeData,
      );
    // if (
    //   Object.keys(before_changes).length !== 0 &&
    //   Object.keys(current_changes).length !== 0
    // ) {
    //after update related components and recipe also need to update
    await this.priceUpdateService.getSubRecipePlusComponentUpdateAfterUpdate(
      id,
      'component_id',
    );
    await this.priceUpdateService.getRecipeUpdateAfterComponentUpdate(id);
    // }

    return {
      updateComponent,
      type: updateComponentDto.recipe_type,
      before_changes,
      current_changes,
    };

    // return { updateComponent, type: updateComponentDto.recipe_type };
  }

  async remove(id: string) {
    return await this.componentModel.findByIdAndUpdate(id, {
      is_active: false,
    });
  }

  async findComponents(componentIds: string[]) {
    return await this.componentModel.find({
      _id: { $in: componentIds },
    });
  }
  async findAllComponentsByIds(componentIds: string[]): Promise<any> {
    const pipeline: any[] = [
      {
        $match: {
          _id: {
            $in: componentIds.map((item) => new mongoose.Types.ObjectId(item)),
          },
        },
      },
      // {
      //   $graphLookup: {
      //     from: 'components',
      //     startWith: '$_id',
      //     connectFromField: 'composition.component_id',
      //     connectToField: '_id',
      //     as: 'sub_recipe_list',
      //     maxDepth: 10,
      //     depthField: 'level',
      //   },
      // },
      // {
      //   $graphLookup: {
      //     from: 'recipes_details',
      //     startWith: {
      //       $map: {
      //         input: '$sub_recipe_list',
      //         as: 'comp',
      //         in: '$$comp._id',
      //       },
      //     },
      //     connectFromField: '_id',
      //     connectToField: 'composition.component_id',
      //     as: 'recipe_list',
      //     maxDepth: 10,
      //   },
      // },
      // {
      //   $addFields: {
      //     sub_recipe_list: {
      //       $filter: {
      //         input: '$sub_recipe_list',
      //         as: 'subRecipe',
      //         cond: {
      //           $ne: ['$$subRecipe._id', '$_id'],
      //         },
      //       },
      //     },
      //   },
      // },
      {
        $project: {
          name: 1,
          description: 1,
          // cooking_complexity: 1,
          // useblefor_other: 1,
          // is_frozen: 1,
          // stockable: 1,
          // highly_perishable: 1,
          // final_dish_image: 1,
          is_active: 1,
          recipe_type: 1,
          // use_calculated_weight: 1,
          // allergens: 1,
          // dish_tag: 1,
          createdAt: 1,
          updatedAt: 1,
          calculated_price: 1,
          calculated_weight: 1,
          // composition: 1,
          manual_weight: 1,
          // price: {
          //   $round: [
          //     {
          //       $divide: [
          //         {
          //           $multiply: ['$calculated_price', 100],
          //         },
          //         {
          //           $cond: {
          //             if: {
          //               $or: [
          //                 { $eq: ['$use_calculated_weight', true] },
          //                 { $eq: ['$manual_weight', 0] },
          //               ],
          //             },
          //             then: {
          //               $cond: {
          //                 if: { $eq: ['$calculated_weight', 0] },
          //                 then: 1,
          //                 else: '$calculated_weight',
          //               },
          //             },
          //             else: '$manual_weight',
          //           },
          //         },
          //       ],
          //     },
          //     2,
          //   ],
          // },
          // sub_recipe_list: {
          //   _id: 1,
          //   name: 1,
          // },
          // recipe_list: {
          //   _id: 1,
          //   dish_name: 1,
          // },
        },
      },
    ];

    const components = await this.componentModel.aggregate(pipeline);

    return {
      list: components,
      totalcomponents: components.length,
      currentPage: 1,
      totalPages: 0,
    };
  }
  catch(error) {
    throw error; // You can handle or log the error as needed
  }

  async duplicate(duplicateDTO: DuplicateComponentDTO) {
    const compRecipeDocument: any = await this.componentModel.findOne({
      _id: new mongoose.Types.ObjectId(duplicateDTO?.id),
      // ...duplicateDTO,
    });
    if (compRecipeDocument) {
      const compRecipeData = compRecipeDocument?.toObject();

      await checkNameRecursively(
        this.componentModel,
        compRecipeData,
        duplicateDTO?.recipe_type,
      );
      delete compRecipeData['_id'];
      delete compRecipeData['updatedAt'];
      delete compRecipeData['createdAt'];
      const duplicateRecipe: any =
        await this.componentModel.create(compRecipeData);

      return duplicateRecipe;
    } else {
      return false;
    }
  }
}

const copyRecipeFunction = async (compRecipeData: any) => {
  if (
    compRecipeData?.name?.includes('(') &&
    compRecipeData?.name?.includes(')')
  ) {
    const duplicateCount =
      parseInt(
        compRecipeData?.name?.split('(Copy ')?.[1]?.split(')')?.[0]?.trim(),
      ) + 1;
    compRecipeData.name =
      compRecipeData?.name?.split('(')?.[0] + `(Copy ${duplicateCount})`;
  } else {
    compRecipeData.name = compRecipeData?.name + '(Copy 1)';
  }
  return compRecipeData;
};

const checkSameNameRecipe = async (
  compRecipeModel: any,
  compRecipeData: any,
  type: any,
) => {
  return await compRecipeModel.findOne({
    name: compRecipeData?.name,
    recipe_type: type,
  });
};

const checkNameRecursively = async (
  compRecipeModel: any,
  compRecipeData: any,
  type: any,
) => {
  compRecipeData = await copyRecipeFunction(compRecipeData);
  const sameNameRecipe = await checkSameNameRecipe(
    compRecipeModel,
    compRecipeData,
    type,
  );
  if (sameNameRecipe) {
    compRecipeData = await checkNameRecursively(
      compRecipeModel,
      compRecipeData,
      type,
    );
  }
  return compRecipeData;
};

// const calculatePrice = async (recipe: any) => {
//   const calculatedWeight =
//     (recipe?.use_calculated_weight || recipe?.manual_weight == 0
//       ? Number(recipe?.calculated_weight)
//       : Number(recipe?.manual_weight)) || 1;
//   return setRounded(
//     (Number(recipe?.calculated_price) * 100) / calculatedWeight,
//   );
// };
