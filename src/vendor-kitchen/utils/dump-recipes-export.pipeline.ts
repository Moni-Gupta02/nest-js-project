import { PipelineStage, Types } from 'mongoose';

const EXPORT_PROTEIN_CATEGORIES = ['balance', 'low'] as const;

/**
 * MongoDB aggregation: Dump_Recipes → one document per recipe × protein_category (balance | low).
 * dish_name / description / images come from protein_category_info matched on category.
 */
export function buildDumpRecipesVendorExportPipeline(filter: {
  date?: { $gte: Date; $lte: Date };
  menu_id?: Types.ObjectId;
}): PipelineStage[] {
  const matchDump: Record<string, unknown> = {};
  if (filter.date) matchDump.date = filter.date;
  if (filter.menu_id) matchDump.menu_id = filter.menu_id;

  const pciMatchExpr = {
    $eq: ['$$pci.category', '$recipes.protein_category'],
  };

  const matchedPciFirst = {
    $arrayElemAt: [
      {
        $filter: {
          input: { $ifNull: ['$recipes.protein_category_info', []] },
          as: 'pci',
          cond: pciMatchExpr,
        },
      },
      0,
    ],
  };

  return [
    { $match: matchDump },
    { $unwind: '$recipes' },
    { $unwind: '$recipes.protein_category' },
    {
      $match: {
        'recipes.protein_category': { $in: [...EXPORT_PROTEIN_CATEGORIES] },
      },
    },
    {
      $project: {
        _id: 0,
        __v: { $literal: 0 },
        allergens: '$recipes.allergens_contain',
        cuisine: '$recipes.cuisine',
        description: {
          $let: {
            vars: { matchedPci: matchedPciFirst },
            in: {
              $ifNull: ['$$matchedPci.description', '$recipes.description'],
            },
          },
        },
        dish_name: {
          $let: {
            vars: { matchedPci: matchedPciFirst },
            in: {
              $ifNull: ['$$matchedPci.dish_name', '$recipes.dish_name'],
            },
          },
        },
        dish_type: '$recipes.dish_type',
        ingredients: {
          $let: {
            vars: {
              matched: {
                $filter: {
                  input: { $ifNull: ['$recipes.ingredients', []] },
                  as: 'ing',
                  cond: {
                    $eq: ['$$ing.protein_category', '$recipes.protein_category'],
                  },
                },
              },
            },
            in: {
              $ifNull: [{ $arrayElemAt: ['$$matched.ingredients', 0] }, []],
            },
          },
        },
        meal_category: '$recipes.meal_category',
        protein_category: '$recipes.protein_category',
        protein_category_info: {
          $map: {
            input: {
              $filter: {
                input: { $ifNull: ['$recipes.protein_category_info', []] },
                as: 'pci',
                cond: pciMatchExpr,
              },
            },
            as: 'pci',
            in: {
              image_thumb_331x206: {
                $ifNull: [
                  '$$pci.image_thumb_331x206',
                  {
                    $replaceOne: {
                      input: {
                        $ifNull: [{ $arrayElemAt: ['$$pci.image', 0] }, ''],
                      },
                      find: 'rms/dishes/',
                      replacement: 'rms/dishes/thumbnails/thumbnail_350_400/',
                    },
                  },
                ],
              },
              image_thumb_88x106: {
                $ifNull: [
                  '$$pci.image_thumb_88x106',
                  {
                    $replaceOne: {
                      input: {
                        $ifNull: [{ $arrayElemAt: ['$$pci.image', 0] }, ''],
                      },
                      find: 'rms/dishes/',
                      replacement: 'rms/dishes/thumbnails/thumbnail_100_100/',
                    },
                  },
                ],
              },
              category: '$$pci.category',
              dish_name: '$$pci.dish_name',
              description: '$$pci.description',
              image: { $ifNull: ['$$pci.image', []] },
            },
          },
        },
        spice_level: { $ifNull: ['$recipes.spice_level', ''] },
        updatedAt: '$updatedAt',
        website_image: {
          $let: {
            vars: { matchedPci: matchedPciFirst },
            in: {
              $map: {
                input: { $ifNull: ['$$matchedPci.image', []] },
                as: 'img',
                in: { image: '$$img', source: 'internal' },
              },
            },
          },
        },
        variants: {
          $map: {
            input: {
              $filter: {
                input: { $ifNull: ['$recipes.variants', []] },
                as: 'v',
                cond: {
                  $eq: ['$$v.protein_category', '$recipes.protein_category'],
                },
              },
            },
            as: 'v',
            in: {
              size: '$$v.size',
              kcal: '$$v.kcal',
              protein: '$$v.protein',
              carb: '$$v.carb',
              fat: '$$v.fat',
              protein_option: '$$v.protein_option',
              protein_category: '$$v.protein_category',
              variant_ingredients: { $ifNull: ['$$v.variant_ingredients', []] },
              price: {
                $let: {
                  vars: {
                    matchedPrice: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ['$recipes.price', []] },
                            as: 'p',
                            cond: {
                              $and: [
                                {
                                  $eq: ['$$p.protein_type', '$$v.protein_option'],
                                },
                                {
                                  $eq: [
                                    '$$p.protein_category',
                                    '$$v.protein_category',
                                  ],
                                },
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ['$$v.size', 'extra_small'] },
                          then: {
                            $ifNull: ['$$matchedPrice.size_prices.extra_small', 0],
                          },
                        },
                        {
                          case: { $eq: ['$$v.size', 'small'] },
                          then: {
                            $ifNull: ['$$matchedPrice.size_prices.small', 0],
                          },
                        },
                        {
                          case: { $eq: ['$$v.size', 'medium'] },
                          then: {
                            $ifNull: ['$$matchedPrice.size_prices.medium', 0],
                          },
                        },
                        {
                          case: { $eq: ['$$v.size', 'large'] },
                          then: {
                            $ifNull: ['$$matchedPrice.size_prices.large', 0],
                          },
                        },
                        {
                          case: { $eq: ['$$v.size', 'extra_large'] },
                          then: {
                            $ifNull: ['$$matchedPrice.size_prices.extra_large', 0],
                          },
                        },
                        {
                          case: { $eq: ['$$v.size', 'standard'] },
                          then: {
                            $ifNull: ['$$matchedPrice.average_price', 0],
                          },
                        },
                      ],
                      default: 0,
                    },
                  },
                },
              },
              packaging_material: {
                $map: {
                  input: { $ifNull: ['$$v.packaging_material', []] },
                  as: 'pm',
                  in: {
                    material: { $ifNull: ['$$pm.material', ''] },
                    description: { $ifNull: ['$$pm.description', ''] },
                    instruction: { $ifNull: ['$$pm.instruction', ''] },
                    is_main: { $ifNull: ['$$pm.is_main', false] },
                    is_inside: { $ifNull: ['$$pm.is_inside', false] },
                    is_separate: { $ifNull: ['$$pm.is_separate', false] },
                    allergens: { $ifNull: ['$$pm.allergens', []] },
                  },
                },
              },
            },
          },
        },
      },
    },
  ];
}
