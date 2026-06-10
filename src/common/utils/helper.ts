import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ComponentDocument } from 'src/component/Schemas/component.schema';
import { IngredientDocument } from 'src/ingredient/schemas/ingredient.schema';
import { RecipeDocument } from 'src/recipes/schemas/recipe.schema';
import { convertToObjectId, setRounded } from './utils';
import { HistoryDocument } from 'src/history/Schemas/history.schema';
import { MasterDataDocument } from 'src/masterdata/Schemas/masterdata.schema';
import * as moment from 'moment';
const proteinSize = [
  'small',
  'medium',
  'large',
  'standard',
  'extra_small',
  'extra_large',
];
const proteinCategory = [
  'balance',
  'low',
  'low_fat',
  'ultra_low_carb',
  'low_carb',
  'high_carb',
  'intermediate',
  'vegetarian',
  'pcos',
  'diabetes',
  'smart_saver'
];
export async function getUpdatedSupplierDetails(ingredientDto: any) {
  try {
    if (ingredientDto.supplier_details) {
      const updatedSupplierDocuments = await Promise.all(
        ingredientDto.supplier_details.map(async (data: any) => {
          const singleAvgPriceKg =
            (data.single_package.price * data.conversion_ratio) /
            data.single_package.size;
          const bulkAvgPriceKg =
            (data.bulk_package.price * data.conversion_ratio) /
            (data.bulk_package.size * data.bulk_number);
          // Return the updated
          return {
            ...data, // Spread the original data
            supplier: new mongoose.Types.ObjectId(data.supplier as any), // Convert supplier to ObjectId
            single_package: {
              ...data.single_package, // Spread the original single_package data
              per_kg_price: setRounded(singleAvgPriceKg), // Append converted single package price in kg
            },
            bulk_package: {
              ...data.bulk_package, // Spread the original bulk_package data
              per_kg_price: setRounded(bulkAvgPriceKg), // Append converted bulk package price in kg
            },
          };
        }),
      );
      ingredientDto.supplier_details = updatedSupplierDocuments;
    }

    if (ingredientDto.nutrition) {
      ingredientDto.nutrition.kcal = setRounded(
        4 * (ingredientDto.nutrition.protein + ingredientDto.nutrition.carb) +
        9 * ingredientDto.nutrition.fat,
      );
    }
    return ingredientDto;
  } catch (error) {
    // Handle any errors that occur during the update process
    console.error('Error updating supplier details:', error);
    throw error; // Rethrow the error to be caught by the caller
  }
}

export async function convertedSupplierDetails(ingredientDto: any) {
  try {
    let updatedDocuments: any[];
    if (ingredientDto.supplier_details) {
      updatedDocuments = await Promise.all(
        ingredientDto.supplier_details.map(async (data: any) => {
          return {
            ...data, // Spread the original data
            supplier: new mongoose.Types.ObjectId(data.supplier as any), // Convert supplier to ObjectId
          };
        }),
      );
    }

    return updatedDocuments;
  } catch (error) {
    // Handle any errors that occur during the update process
    console.error('Error updating supplier details:', error);
    throw error; // Rethrow the error to be caught by the caller
  }
}
@Injectable()
export class PriceUpdateService {
  constructor(
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel('MasterDataKMS')
    private readonly masterDataModel: Model<MasterDataDocument>,
  ) { }
  // Function to get ingredient details for a recipe
  async getRecipeIngredients(recipeId: mongoose.Types.ObjectId) {
    const recipe = await this.recipeModel
      .findById(recipeId)
      .populate('composition.component_id composition.ingredient_id');
    // console.log('recipe', recipe);
    const ingredientMap = await this.aggregateIngredients(recipe.composition);

    // Format the results
    const ingredientDetails = [];
    for (const [ingredientId, quantity] of ingredientMap) {
      ingredientDetails.push({
        ingredientId,
        quantity,
      });
    }

    return ingredientDetails;
  }

  async findRecipesUsingSubRecipe(subRecipeId: string) {
    try {
      // Initialize sets to store unique component and recipe IDs
      const visitedComponents = new Set<string>();
      const resultComponents: { id: string; name: string }[] = [];
      const visitedRecipes = new Set<string>();
      const resultRecipes: { id: string; name: string }[] = [];

      // Queue to perform BFS
      const queue: string[] = [subRecipeId];

      // Perform BFS to find all parent components and recipes
      while (queue.length > 0) {
        const currentComponentId = queue.shift();

        if (currentComponentId && !visitedComponents.has(currentComponentId)) {
          visitedComponents.add(currentComponentId);

          // Find all parent components that use the current component
          const parentComponents = await this.componentModel
            .find(
              {
                'composition.component_id': new mongoose.Types.ObjectId(
                  currentComponentId,
                ),
              },
              '_id name',
            )
            .lean();

          // Add parent components to the queue and resultComponents
          parentComponents.forEach((parentComponent) => {
            const parentId = parentComponent._id.toString();
            if (!visitedComponents.has(parentId)) {
              queue.push(parentId);
              resultComponents.push({
                id: parentId,
                name: parentComponent.name,
              });
            }
          });

          // Find all recipes that use the current component
          const parentRecipes = await this.recipeModel
            .find(
              {
                'composition.component_id': new mongoose.Types.ObjectId(
                  currentComponentId,
                ),
              },
              '_id dish_name',
            )
            .lean();

          // Add parent recipes to the visited set and resultRecipes
          parentRecipes.forEach((parentRecipe) => {
            const recipeId = parentRecipe._id.toString();
            if (!visitedRecipes.has(recipeId)) {
              visitedRecipes.add(recipeId);
              resultRecipes.push({
                id: recipeId,
                name: parentRecipe.dish_name,
              });
            }
          });
        }
      }

      // Return the list of recipes with their names
      return { resultRecipes, resultComponents };
    } catch (error) {
      console.error('Error findRecipesUsingSubRecipe:', error);
      throw error;
    }
  }
  async findRecipesUsingIngredients(ingredientId: mongoose.Types.ObjectId) {
    try {
      // Find all components that directly reference the target ingredient
      const directComponentUsages = await this.componentModel.find({
        'composition.ingredient_id': ingredientId,
      });

      // Initialize sets to store unique component and recipe IDs
      const uniqueComponents = new Set(
        directComponentUsages.map((usage) => usage._id.toString()),
      );
      const uniqueRecipes = new Set();

      // Recursive function to find all parent components
      async function findAllParentComponents(
        componentId: mongoose.Types.ObjectId,
      ) {
        const parents = await this.componentModel.find({
          'composition.component_id': componentId,
        });
        for (const parent of parents) {
          if (!uniqueComponents.has(parent._id.toString())) {
            uniqueComponents.add(parent._id.toString());
            await findAllParentComponents(parent._id);
          }
        }
      }

      // Recursive function to find all parent recipes
      async function findAllParentRecipes(
        componentId: mongoose.Types.ObjectId,
      ) {
        const parentRecipes = await this.recipeModel.find({
          'composition.component_id': componentId,
        });
        for (const parentRecipe of parentRecipes) {
          if (!uniqueRecipes.has(parentRecipe._id.toString())) {
            uniqueRecipes.add(parentRecipe._id.toString());
            for (const comp of parentRecipe.composition) {
              if (comp.component_id) {
                await findAllParentComponents(comp.component_id);
                await findAllParentRecipes(comp.component_id);
              }
            }
          }
        }
      }

      // Find all indirect usages in components
      for (const usage of directComponentUsages) {
        await findAllParentComponents(usage._id);
        await findAllParentRecipes(usage._id);
      }

      // Find all recipes that directly reference the target ingredient
      // const directRecipeUsages = await this.recipeModel.find({
      //   'composition.ingredient_id': ingredientId,
      // });
      // for (const usage of directRecipeUsages) {
      //   uniqueRecipes.add(usage._id.toString());
      //   for (const comp of usage.composition) {
      //     if (comp.component_id) {
      //       await findAllParentComponents(comp.component_id);
      //       await findAllParentRecipes(comp.component_id);
      //     }
      //   }
      // }

      // Prepare the detailed result
      const resultRecipes = await this.recipeModel
        .find({
          _id: { $in: Array.from(uniqueRecipes) },
        })
        .select('dish_name _id')
        .lean();
      const resultComponents = await this.componentModel
        .find({
          _id: { $in: Array.from(uniqueComponents) },
        })
        .select('name _id')
        .lean();

      return {
        total: uniqueComponents.size + uniqueRecipes.size,
        recipes: uniqueRecipes.size,
        subRecipes: uniqueComponents.size,
        resultRecipes: resultRecipes.map((recipe) => ({
          id: recipe._id,
          name: recipe.dish_name,
        })),
        resultComponents: resultComponents.map((component) => ({
          id: component._id,
          name: component.name,
        })),
      };
    } catch (error) {
      console.error('Error findRecipesUsingIngredients:', error);
      throw error;
    }
  }
  // Helper function to aggregate ingredients
  async aggregateIngredients(compositions) {
    try {
      const ingredientMap = new Map();

      for (const comp of compositions) {
        if (comp.ingredient_id) {
          const ingredientId = comp.ingredient_id.toString();
          const { quantity } = comp;

          if (ingredientMap.has(ingredientId)) {
            ingredientMap.set(
              ingredientId,
              ingredientMap.get(ingredientId) + quantity,
            );
          } else {
            ingredientMap.set(ingredientId, quantity);
          }
        }

        if (comp.component_id) {
          const component = await this.componentModel
            .findById(comp.component_id)
            .populate('composition.component_id composition.ingredient_id');
          const nestedIngredients = await this.aggregateIngredients(
            component.composition,
          );
          for (const [ingredientId, quantity] of nestedIngredients) {
            if (ingredientMap.has(ingredientId)) {
              ingredientMap.set(
                ingredientId,
                ingredientMap.get(ingredientId) + quantity,
              );
            } else {
              ingredientMap.set(ingredientId, quantity);
            }
          }
        }
      }

      return ingredientMap;
    } catch (error) {
      console.error('Error aggregateIngredients:', error);
      throw error;
    }
  }

  async getUpdatedSubRecipeCompositionPrice(recipeDto: any) {
    try {
      if (recipeDto?.composition?.length > 0) {
        let calculatedWeight = 0;
        let calculatedPrice = 0;

        const updatedComposition = await Promise.all(
          recipeDto.composition.map(async (compositionItem: any) => {
            // console.log('Updated composition', compositionItem);

            let componentPrice = 0;
            let componentNutritionKcal = 0;
            let componentNutritionFat = 0;
            let componentNutritionCarb = 0;
            let componentNutritionProtein = 0;

            const compositionNetQty = Number(compositionItem?.net_qty) || 0;

            const wasteFactor =
              compositionItem?.waste > 0
                ? (100 - Number(compositionItem?.waste)) / 100
                : 1;

            if (
              compositionItem?.ingredient_id &&
              compositionItem?.ingredient_id !== ''
            ) {
              const ingredientData = await this.ingredientModel.findById(
                compositionItem.ingredient_id,
              );
              console.log('Ingredient inner', ingredientData?.name);
              if (ingredientData) {
                const supplierData = ingredientData?.supplier_details?.find(
                  (item: { supplier_pref: number }) => item.supplier_pref === 1,
                );

                let ingredientStdPrice =
                  Number(supplierData?.single_package.per_kg_price) || 0;

                const waste = Number(ingredientData?.waste) || 0;
                if (waste > 0) {
                  ingredientStdPrice *= 100 / (100 - waste);
                }

                if (compositionItem.unit === 'g') {
                  componentPrice =
                    (ingredientStdPrice * compositionNetQty) / 1000;
                  componentPrice /= wasteFactor;
                }

                componentNutritionKcal =
                  (Number(ingredientData?.nutrition?.kcal) *
                    compositionNetQty) /
                  100;
                componentNutritionFat =
                  (Number(ingredientData?.nutrition?.fat) * compositionNetQty) /
                  100;
                componentNutritionCarb =
                  (Number(ingredientData?.nutrition?.carb) *
                    compositionNetQty) /
                  100;
                componentNutritionProtein =
                  (Number(ingredientData?.nutrition?.protein) *
                    compositionNetQty) /
                  100;
              }
              compositionItem.ingredient_id = await convertToObjectId(
                compositionItem.ingredient_id,
              );
            } else if (
              compositionItem?.component_id &&
              compositionItem?.component_id !== ''
            ) {
              const componentData = await this.componentModel.findById(
                compositionItem.component_id,
              );

              console.log(
                'Component inner',
                componentData?.name,
                componentData?.composition?.length,
              );

              if (componentData?.composition?.length > 0) {
                console.log('Component composition inner');
                const totals = componentData.composition.reduce(
                  (acc, componentObj) => {
                    acc.componentStdPrice += Number(componentObj?.price) || 0;
                    acc.totalKcal += Number(componentObj?.kcal) || 0;
                    acc.totalFat += Number(componentObj?.fat) || 0;
                    acc.totalProtein += Number(componentObj?.protein) || 0;
                    acc.totalCarb += Number(componentObj?.carb) || 0;
                    return acc;
                  },
                  {
                    componentStdPrice: 0,
                    totalKcal: 0,
                    totalFat: 0,
                    totalProtein: 0,
                    totalCarb: 0,
                  },
                );

                const calculatedWeight =
                  (componentData?.use_calculated_weight ||
                    componentData?.manual_weight == 0
                    ? Number(componentData?.calculated_weight)
                    : Number(componentData?.manual_weight)) || 1;

                componentPrice =
                  (compositionNetQty * totals.componentStdPrice) /
                  calculatedWeight;
                componentPrice /= wasteFactor;

                componentNutritionKcal =
                  (compositionNetQty * totals.totalKcal) / calculatedWeight;
                componentNutritionFat =
                  (compositionNetQty * totals.totalFat) / calculatedWeight;
                componentNutritionCarb =
                  (compositionNetQty * totals.totalCarb) / calculatedWeight;
                componentNutritionProtein =
                  (compositionNetQty * totals.totalProtein) / calculatedWeight;

                // compositionItem.component_id = await convertToObjectId(
                //   compositionItem.component_id,
                // );
                // compositionItem.packaging_material = await convertToObjectId(
                //   compositionItem.packaging_material,
                // );
              }
              compositionItem.component_id = await convertToObjectId(
                compositionItem?.component_id,
              );
              compositionItem.packaging_material = await convertToObjectId(
                compositionItem?.packaging_material,
              );
            }

            compositionItem.price = setRounded(componentPrice);
            compositionItem.kcal = setRounded(componentNutritionKcal);
            compositionItem.fat = setRounded(componentNutritionFat);
            compositionItem.carb = setRounded(componentNutritionCarb);
            compositionItem.protein = setRounded(componentNutritionProtein);
            compositionItem.unit = 'g';
            calculatedWeight += compositionNetQty;
            calculatedPrice += setRounded(componentPrice);

            return compositionItem;
          }),
        );

        recipeDto.composition = updatedComposition;
        recipeDto.calculated_weight = setRounded(calculatedWeight);
        recipeDto.calculated_price = setRounded(calculatedPrice);

        // console.log('calculatedWeight', calculatedWeight);
      }

      return recipeDto;
    } catch (error) {
      console.error('Error getUpdatedSubRecipeCompositionPrice:', error);
      throw error;
    }
  }

  async getRecipeUpdatedComposition(recipeDto: any, recipeId: string) {
    try {
      const recipeCalculatedWeight: { [key: string]: number } = {};
      const recipeCalculatedPrice: { [key: string]: number } = {};
      const allergens = [];
      const diet_type = [];
      ///////////////////////////remove general protein_category Logic/////////////////////
      let allowProteinCategory = proteinCategory;
      if (recipeDto?.protein_category?.length > 0) {
        allowProteinCategory = recipeDto?.protein_category.map(
          (item) => item.category,
        );
      }
      // console.log('"allowProteinCategory"', allowProteinCategory);

      const recipeData = await this.recipeModel.findOne({
        _id: new mongoose.Types.ObjectId(recipeId),
      });
      interface MasterDataItem {
        value: {
          key: string;
          is_vegetarian: boolean;
        };
      }
      const masterData: MasterDataItem[] = await this.masterDataModel.find({
        key: 'composition_type',
        is_active: true,
      });
      const proteinTypes =
        recipeDto?.protein_size?.length > 0
          ? recipeDto.protein_size
          : recipeData?.protein_size?.length
            ? recipeData.protein_size
            : proteinSize;
      // console.log('================================', proteinTypes);
      if (!recipeDto?.composition || recipeDto?.composition?.length == 0) {
        recipeDto.composition = recipeData?.composition || [];
      }
      // console.log(
      //   '================================composition length',
      //   recipeDto?.composition?.length,
      // );
      if (recipeDto?.composition?.length > 0) {
        let totalProteinTypeData = recipeDto?.composition
          ?.filter((item: any) => item?.type?.indexOf('Protein') > -1)
          .map((item: any) => item);

        const recipeComponantDb = recipeData?.composition || [];

        if (totalProteinTypeData.length === 0) {
          totalProteinTypeData = [{ type: 'Standard' }];
        }
        const componentProteinTypes = [];
        const proteinTypeTotals = {}; // To store total prices and counts
        const updatedComposition = await Promise.all(
          await recipeDto?.composition.map(async (component: any) => {
            const componentPrices: { [key: string]: number } = {};
            const componentKcal: { [key: string]: number } = {};
            const componentCarb: { [key: string]: number } = {};
            const componentFat: { [key: string]: number } = {};
            const componentProtein: { [key: string]: number } = {};
            // let componentNutrition: { [key: string]: number } = {};
            const componentProteinCategory = component.protein_category.filter(
              (value) => allowProteinCategory.includes(value),
            );

            console.log('componentProteinCategory', componentProteinCategory);
            const portioningBalance = [];

            let componentData: any;
            if (component?.component_name && component?.component_id == '') {
              // console.log(
              //   'Create New Component==============>',
              //   component?.component_name,
              // );
              componentData = await this.componentModel.create({
                name: component?.component_name,
                recipe_type: 'sub-recipe',
              });
              component.component_id = componentData?._id;
            }
            if (component?.component_id) {
              componentData = await this.componentModel.findById(
                component.component_id,
              );
              if (componentData?.allergens?.length > 0) {
                allergens.push(...componentData.allergens);
              }
              if (componentData?.diet_type?.length > 0) {
                diet_type.push(...componentData.diet_type);
              }
              if (componentData?.composition?.length > 0) {
                const totals = componentData.composition.reduce(
                  (accumulator: any, componentObj: any) => {
                    accumulator.componentStdPrice +=
                      Number(componentObj?.price) || 0;
                    accumulator.totalKcal += Number(componentObj?.kcal) || 0;
                    accumulator.totalFat += Number(componentObj?.fat) || 0;
                    accumulator.totalProtein +=
                      Number(componentObj?.protein) || 0;
                    accumulator.totalCarb += Number(componentObj?.carb) || 0;
                    return accumulator;
                  },
                  {
                    componentStdPrice: 0,
                    totalKcal: 0,
                    totalFat: 0,
                    totalProtein: 0,
                    totalCarb: 0,
                  },
                );

                const calculatedWeight =
                  (componentData?.use_calculated_weight ||
                    componentData?.manual_weight == 0
                    ? Number(componentData?.calculated_weight)
                    : Number(componentData?.manual_weight)) || 1;

                proteinTypes.forEach((type: string) => {
                  componentPrices[type] =
                    setRounded(
                      (Number(component[type]) * totals.componentStdPrice) /
                      calculatedWeight,
                    ) || 0;
                  componentKcal[type] =
                    setRounded(
                      (Number(component[type]) * totals.totalKcal) /
                      calculatedWeight,
                    ) || 0;
                  componentCarb[type] =
                    setRounded(
                      (Number(component[type]) * totals.totalCarb) /
                      calculatedWeight,
                    ) || 0;
                  componentFat[type] =
                    setRounded(
                      (Number(component[type]) * totals.totalFat) /
                      calculatedWeight,
                    ) || 0;
                  componentProtein[type] =
                    setRounded(
                      (Number(component[type]) * totals.totalProtein) /
                      calculatedWeight,
                    ) || 0;
                  if (!recipeCalculatedWeight[type]) {
                    recipeCalculatedWeight[type] = 0;
                  }
                  if (!recipeCalculatedPrice[type]) {
                    recipeCalculatedPrice[type] = 0;
                  }
                  recipeCalculatedWeight[type] += Number(component[type]);
                  recipeCalculatedPrice[type] += componentPrices[type];
                });

                // componentNutrition = {
                //   fat:
                //     (Number(component?.medium) * totals.totalFat) /
                //       calculatedWeight || 0,
                //   carb:
                //     (Number(component?.medium) * totals.totalCarb) /
                //       calculatedWeight || 0,
                //   protein:
                //     (Number(component?.medium) * totals.totalProtein) /
                //       calculatedWeight || 0,
                // };

                component.component_id = await convertToObjectId(
                  component.component_id,
                );
                const recipePackageMaterialDb =
                  recipeComponantDb.find(
                    (item) =>
                      item.component_id?.toString() ==
                      component.component_id?.toString(),
                  ) || null;

                const recipePackageMaterialDbId =
                  recipePackageMaterialDb?.packaging_material || null;

                const recipePackageMaterialDbDescription =
                  recipePackageMaterialDb?.description || '';
                const recipePackageMaterialDbInstruction =
                  recipePackageMaterialDb?.instruction || '';

                await Promise.all(
                  totalProteinTypeData.map(
                    async (proteinData: { type: any; component_id: any }) => {
                      const proteinType =
                        proteinData.type === 'Standard'
                          ? 'Standard'
                          : proteinData.type.split('-')[1]?.trim();
                      if (
                        component.type.indexOf('Protein') === -1 ||
                        (proteinData.type == component.type &&
                          component.type.indexOf('Protein') > -1)
                      ) {
                        await Promise.all(
                          componentProteinCategory.map(
                            async (portioningCategory: any) => {
                              await Promise.all(
                                proteinTypes.map(async (type: string) => {
                                  const portioningDetails =
                                    component.portioning_balance?.find(
                                      (item: {
                                        protein_category: string;
                                        protein_type: string;
                                        type: string;
                                        packaging_material: string;
                                      }) =>
                                        item.protein_type === proteinType &&
                                        item.type === type &&
                                        item.protein_category ===
                                        portioningCategory,
                                    );

                                  let netQty =
                                    Number(portioningDetails?.net_qty) ||
                                    Number(component[type]);

                                  /////////// Veg Large Conditions//////////////
                                  let checkVegLarge = false;
                                  if (type == 'extra_large') {
                                    const checkVeg = masterData.find(
                                      (item) =>
                                        item.value.key ==
                                        `Protein - ${proteinType}`,
                                    );

                                    if (checkVeg?.value?.is_vegetarian) {
                                      netQty = 0;
                                      checkVegLarge = true;
                                    }
                                  }

                                  const proteinPrice =
                                    (netQty * totals.componentStdPrice) /
                                    calculatedWeight;
                                  const proteinNutritionKcal =
                                    (netQty * totals.totalKcal) /
                                    calculatedWeight;
                                  const proteinNutritionFat =
                                    (netQty * totals.totalFat) /
                                    calculatedWeight;
                                  const proteinNutritionCarb =
                                    (netQty * totals.totalCarb) /
                                    calculatedWeight;
                                  const proteinNutritionProtein =
                                    (netQty * totals.totalProtein) /
                                    calculatedWeight;
                                  const proteinIsFinalized =
                                    portioningDetails?.is_finalized;

                                  if (!checkVegLarge) {
                                    let portion = {
                                      net_qty: netQty || 0,
                                      protein_type: proteinType,
                                      type,
                                      protein_category: portioningCategory,
                                      price: setRounded(proteinPrice) || 0,
                                      kcal:
                                        setRounded(proteinNutritionKcal) || 0,
                                      fat: setRounded(proteinNutritionFat) || 0,
                                      carb:
                                        setRounded(proteinNutritionCarb) || 0,
                                      protein:
                                        setRounded(proteinNutritionProtein) ||
                                        0,
                                      is_finalized: proteinIsFinalized,
                                      // Preserve existing values, don't add new ones from component
                                      ...(portioningDetails?.is_main !== undefined && { is_main: portioningDetails.is_main }),
                                      ...(portioningDetails?.is_inside !== undefined && { is_inside: portioningDetails.is_inside }),
                                      ...(portioningDetails?.is_separate !== undefined && { is_separate: portioningDetails.is_separate }),
                                      ...(portioningDetails?.packaging_material && {
                                        packaging_material: await convertToObjectId(portioningDetails.packaging_material)
                                      }),
                                      ...(portioningDetails?.material && { material: portioningDetails.material }),
                                      ...(portioningDetails?.description && { description: portioningDetails.description }),
                                      ...(portioningDetails?.instruction && { instruction: portioningDetails.instruction }),
                                    };
                                    // console.log(
                                    //   'Enter Package Material Change',
                                    //   recipePackageMaterialDbId.toString() !=
                                    //     component.packaging_material.toString(),
                                    //   '       ',
                                    //   'Enter Package Material New',
                                    //   !portioningDetails?.packaging_material,
                                    //   '       ',
                                    //   'Enter Package Material Same',
                                    //   portioningDetails?.packaging_material.toString() ==
                                    //     component.packaging_material.toString(),
                                    // );
                                    //////////////Package material ///////////////
                                    // COMMENTED OUT: Packaging material update logic
                                    // if (
                                    //   !portioningDetails?.packaging_material
                                    // ) {
                                    //   console.log('iff');
                                    //   portion = {
                                    //     ...portion,
                                    //     packaging_material:
                                    //       (await convertToObjectId(
                                    //         component?.packaging_material,
                                    //       )) || null,
                                    //     material: component?.material,
                                    //     description: component?.description,
                                    //     instruction: component?.instruction,
                                    //   };
                                    // } else {
                                    //   // console.log('else');
                                    //   if (
                                    //     recipePackageMaterialDbId?.toString() !=
                                    //     component?.packaging_material?.toString()
                                    //   ) {
                                    //     // console.log('if 1');
                                    //     portion = {
                                    //       ...portion,
                                    //       packaging_material:
                                    //         (await convertToObjectId(
                                    //           component?.packaging_material,
                                    //         )) || null,
                                    //       material: component?.material,
                                    //       description: component?.description,
                                    //       instruction: component?.instruction,
                                    //     };
                                    //   } else {
                                    //     // console.log('else 2');
                                    //     if (
                                    //       recipePackageMaterialDbDescription
                                    //         ?.trim()
                                    //         ?.toString() !=
                                    //       component?.description
                                    //         ?.trim()
                                    //         ?.toString()
                                    //     ) {
                                    //       // console.log('if 2');
                                    //       portion = {
                                    //         ...portion,
                                    //         packaging_material:
                                    //           (await convertToObjectId(
                                    //             component?.packaging_material,
                                    //           )) || null,
                                    //         material: component?.material,
                                    //         description: component?.description,
                                    //       };
                                    //     }
                                    //     if (
                                    //       recipePackageMaterialDbInstruction
                                    //         ?.trim()
                                    //         ?.toString() !=
                                    //       component?.instruction
                                    //         ?.trim()
                                    //         ?.toString()
                                    //     ) {
                                    //       // console.log('if 3');
                                    //       portion = {
                                    //         ...portion,
                                    //         packaging_material:
                                    //           (await convertToObjectId(
                                    //             component?.packaging_material,
                                    //           )) || null,
                                    //         material: component?.material,
                                    //         instruction: component?.instruction,
                                    //       };
                                    //     }
                                    //   }
                                    // }
                                    // console.log(portion.description);
                                    portioningBalance.push(portion);
                                  } else {
                                    // console.log(
                                    //   'checkVegLarge',
                                    //   checkVegLarge,
                                    //   type,
                                    //   proteinType,
                                    // );
                                  }

                                  if (!proteinTypeTotals[portioningCategory]) {
                                    proteinTypeTotals[portioningCategory] = {};
                                  }

                                  if (
                                    !proteinTypeTotals[portioningCategory][
                                    proteinType
                                    ]
                                  ) {
                                    proteinTypeTotals[portioningCategory][
                                      proteinType
                                    ] = {
                                      totalPrice: 0,
                                      totalWeight: 0,
                                      sizes: new Set(),
                                    };
                                  }

                                  proteinTypeTotals[portioningCategory] =
                                    proteinTypeTotals[portioningCategory] || {};

                                  proteinTypeTotals[portioningCategory][
                                    proteinType
                                  ] = proteinTypeTotals[portioningCategory][
                                  proteinType
                                  ] || { sizes: {} };

                                  proteinTypeTotals[portioningCategory][
                                    proteinType
                                  ].sizes[type] = proteinTypeTotals[
                                    portioningCategory
                                  ][proteinType].sizes[type] || {
                                      totalPrice: 0,
                                      totalWeight: 0,
                                    };

                                  proteinTypeTotals[portioningCategory][
                                    proteinType
                                  ].totalPrice += proteinPrice || 0;
                                  proteinTypeTotals[portioningCategory][
                                    proteinType
                                  ].totalWeight += netQty || 0;
                                  proteinTypeTotals[portioningCategory][
                                    proteinType
                                  ].sizes[type].totalPrice += proteinPrice || 0;
                                  proteinTypeTotals[portioningCategory][
                                    proteinType
                                  ].sizes[type].totalWeight += netQty || 0;
                                }),
                              );
                            },
                          ),
                        );
                      }
                    },
                  ),
                );
              }
            }

            return {
              ...component,
              component_id: await convertToObjectId(component.component_id),
              packaging_material: await convertToObjectId(
                component.packaging_material,
              ),
              protein_category: componentProteinCategory,
              container_id: Number(component.container_id),
              price: componentPrices,
              kcal: componentKcal,
              carb: componentCarb,
              fat: componentFat,
              protein: componentProtein,
              portioning_balance: portioningBalance || [],
            };
          }),
        );

        // Calculate average prices and add to componentProteinTypes
        for (const portioningCategory in proteinTypeTotals) {
          for (const proteinType in proteinTypeTotals[portioningCategory]) {
            const { totalPrice, totalWeight, sizes } =
              proteinTypeTotals[portioningCategory][proteinType];
            const sizeKeys = Object.keys(sizes);
            const count = sizeKeys.reduce(
              (acc, size) => acc + (sizes[size].totalPrice > 0 ? 1 : 0),
              0,
            );
            const sizePrices = sizeKeys.reduce((acc, size) => {
              acc[size] = setRounded(sizes[size].totalPrice);
              return acc;
            }, {});

            const sizeWeights = sizeKeys.reduce((acc, size) => {
              acc[size] = setRounded(sizes[size].totalWeight);
              return acc;
            }, {});

            const averagePrice = count > 0 ? totalPrice / count : 0;
            const averageWeight = count > 0 ? totalWeight / count : 0;

            componentProteinTypes.push({
              protein_category: portioningCategory,
              protein_type: proteinType,
              average_price: setRounded(averagePrice),
              average_weight: setRounded(averageWeight),
              size_prices: sizePrices,
              size_weights: sizeWeights,
            });
          }
        }

        // Prepare data for recipeDto.price
        const nddPrice = recipeDto.price ? recipeDto.price : recipeData.price;
        const newNddPrice = componentProteinTypes.map((ele) => {
          const oldNddPrice = nddPrice?.find(
            (elePrice: { protein_type: any }) =>
              elePrice.protein_type == ele.protein_type,
          );

          return {
            protein_type: ele.protein_type,
            protein_category: ele.protein_category,
            price: oldNddPrice?.price || 0,
            average_price: ele.average_price,
            average_weight: ele.average_weight,
            size_prices: ele.size_prices,
            size_weights: ele.size_weights,
          };
        });

        recipeDto.price = newNddPrice;

        recipeDto.composition = updatedComposition;
      }

      ///////////////////////////Updated Calculated Values ///////////////////////////
      recipeDto.calculated_weight = Object.fromEntries(
        Object.entries(recipeCalculatedWeight).map(([key, value]) => [
          key,
          setRounded(value),
        ]),
      );
      recipeDto.calculated_price = Object.fromEntries(
        Object.entries(recipeCalculatedPrice).map(([key, value]) => [
          key,
          setRounded(value),
        ]),
      );
      recipeDto.allergens = [...new Set(allergens)];
      recipeDto.diet_type = [...new Set(diet_type)];

      if (recipeDto?.cuisine) {
        recipeDto.cuisine = await convertToObjectId(recipeDto.cuisine);
      }
      let is_live: boolean;
      if (recipeData.meal_category === 'NDD') {
        recipeDto.price?.map((priceOfItm) => {
          if (priceOfItm?.price <= 0) {
            is_live = false;
          }
        });

        if (is_live == false) {
          recipeDto.is_live = false;
        }
      }
      return recipeDto;
    } catch (error) {
      // Handle any errors that occur during the update process
      console.error('Error getRecipeUpdatedComposition details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async getUpdatePortioning(composition: any, recipe_id: string) {
    try {
      const recipeData = await this.recipeModel.findOne({
        _id: new mongoose.Types.ObjectId(recipe_id),
      });
      interface MasterDataItem {
        value: {
          key: string;
          is_vegetarian: boolean;
        };
      }
      const masterData: MasterDataItem[] = await this.masterDataModel.find({
        key: 'composition_type',
        is_active: true,
      });
      const newCompositions = [];
      const componentProteinTypes = [];
      const proteinTypeTotals = {};
      await Promise.all(
        composition.map(async (component: any) => {
          // const updateComponent = async (component: any) => {
          const portioningBalance = [];

          if (!component?.component_id) {
            return component;
          }

          const componentData = await this.componentModel.findById(
            component.component_id,
          );
          if (
            !componentData?.composition?.length ||
            !componentData?.composition
          ) {
            return component;
          }

          const totals = componentData.composition.reduce(
            (accumulator: any, componentObj: any) => {
              accumulator.componentStdPrice += Number(componentObj?.price) || 0;
              accumulator.totalKcal += Number(componentObj?.kcal) || 0;
              accumulator.totalFat += Number(componentObj?.fat) || 0;
              accumulator.totalProtein += Number(componentObj?.protein) || 0;
              accumulator.totalCarb += Number(componentObj?.carb) || 0;
              return accumulator;
            },
            {
              componentStdPrice: 0,
              totalKcal: 0,
              totalFat: 0,
              totalProtein: 0,
              totalCarb: 0,
            },
          );

          const calculatedWeight =
            (componentData?.use_calculated_weight ||
              componentData?.manual_weight == 0
              ? Number(componentData?.calculated_weight)
              : Number(componentData?.manual_weight)) || 1;

          await Promise.all(
            component.portioning_balance.map(
              async (proteinData: {
                protein_category: string;
                net_qty: number;
                protein_type: string;
                type: string;
                packaging_material: string;
                material: string;
                description: string;
                instruction: string;
                is_main: boolean;
                is_inside: boolean;
                is_separate: boolean;
              }) => {
                const type = proteinData.type;
                const proteinType = proteinData.protein_type;
                const portioningCategory = proteinData.protein_category;

                let netQty = Number(proteinData.net_qty);
                const proteinPrice =
                  (netQty * totals.componentStdPrice) / calculatedWeight;
                const proteinNutritionKcal =
                  (netQty * totals.totalKcal) / calculatedWeight;
                const proteinNutritionFat =
                  (netQty * totals.totalFat) / calculatedWeight;
                const proteinNutritionCarb =
                  (netQty * totals.totalCarb) / calculatedWeight;
                const proteinNutritionProtein =
                  (netQty * totals.totalProtein) / calculatedWeight;
                // const proteinIsFinalized =
                //   proteinType == proteinData.protein_type ? isFinalized : false;

                /////////// Veg Large Conditions//////////////
                let checkVegLarge = false;
                if (type == 'extra_large') {
                  const checkVeg = masterData.find(
                    (item) => item.value.key == `Protein - ${proteinType}`,
                  );

                  if (checkVeg?.value?.is_vegetarian) {
                    netQty = 0;
                    checkVegLarge = true;
                  }
                }

                if (!checkVegLarge) {
                  portioningBalance.push({
                    ...proteinData,
                    price: setRounded(proteinPrice) || 0,
                    kcal: setRounded(proteinNutritionKcal) || 0,
                    fat: setRounded(proteinNutritionFat) || 0,
                    carb: setRounded(proteinNutritionCarb) || 0,
                    protein: setRounded(proteinNutritionProtein) || 0,
                    is_main: proteinData?.is_main || false,
                    is_inside: proteinData?.is_inside || false,
                    is_separate: proteinData?.is_separate || false,
                    // is_finalized: proteinIsFinalized,
                    //////////////Package material ///////////////
                    packaging_material:
                      (await convertToObjectId(
                        proteinData?.packaging_material,
                      )) || null,
                    material: proteinData?.material || '',
                    description: proteinData?.description || '',
                    instruction: proteinData?.instruction || '',
                  });
                }
                if (!proteinTypeTotals[portioningCategory]) {
                  proteinTypeTotals[portioningCategory] = {};
                }

                if (!proteinTypeTotals[portioningCategory][proteinType]) {
                  proteinTypeTotals[portioningCategory][proteinType] = {
                    totalPrice: 0,
                    totalWeight: 0,
                    sizes: new Set(),
                  };
                }

                proteinTypeTotals[portioningCategory] =
                  proteinTypeTotals[portioningCategory] || {};

                proteinTypeTotals[portioningCategory][proteinType] =
                  proteinTypeTotals[portioningCategory][proteinType] || {
                    sizes: {},
                  };

                proteinTypeTotals[portioningCategory][proteinType].sizes[type] =
                  proteinTypeTotals[portioningCategory][proteinType].sizes[
                  type
                  ] || {
                    totalPrice: 0,
                    totalWeight: 0,
                  };

                proteinTypeTotals[portioningCategory][proteinType].totalPrice +=
                  proteinPrice || 0;
                proteinTypeTotals[portioningCategory][
                  proteinType
                ].totalWeight += netQty || 0;
                proteinTypeTotals[portioningCategory][proteinType].sizes[
                  type
                ].totalPrice += proteinPrice || 0;
                proteinTypeTotals[portioningCategory][proteinType].sizes[
                  type
                ].totalWeight += netQty || 0;
              },
            ),
          );
          newCompositions.push({
            ...component,
            component_id: new mongoose.Types.ObjectId(component.component_id),
            packaging_material: new mongoose.Types.ObjectId(
              component.packaging_material,
            ),
            portioning_balance: portioningBalance,
          });
        }),
      );
      for (const portioningCategory in proteinTypeTotals) {
        for (const proteinType in proteinTypeTotals[portioningCategory]) {
          const { totalPrice, totalWeight, sizes } =
            proteinTypeTotals[portioningCategory][proteinType];
          const sizeKeys = Object.keys(sizes);
          const count = sizeKeys.reduce(
            (acc, size) => acc + (sizes[size].totalPrice > 0 ? 1 : 0),
            0,
          );
          const sizePrices = sizeKeys.reduce((acc, size) => {
            acc[size] = setRounded(sizes[size].totalPrice);
            return acc;
          }, {});

          const sizeWeights = sizeKeys.reduce((acc, size) => {
            acc[size] = setRounded(sizes[size].totalWeight);
            return acc;
          }, {});

          const averagePrice = count > 0 ? totalPrice / count : 0;
          const averageWeight = count > 0 ? totalWeight / count : 0;

          componentProteinTypes.push({
            protein_category: portioningCategory,
            protein_type: proteinType,
            average_price: setRounded(averagePrice),
            average_weight: setRounded(averageWeight),
            size_prices: sizePrices,
            size_weights: sizeWeights,
          });
        }
      }
      // Prepare data for recipeDto.price
      const nddPrice = recipeData?.price || [];
      const newNddPrice = componentProteinTypes.map((ele) => {
        const oldNddPrice = nddPrice?.find(
          (elePrice: { protein_type: any }) =>
            elePrice.protein_type == ele.protein_type,
        );

        return {
          protein_type: ele.protein_type,
          protein_category: ele.protein_category,
          price: oldNddPrice?.price || 0,
          average_price: ele.average_price,
          average_weight: ele.average_weight,
          size_prices: ele.size_prices,
          size_weights: ele.size_weights,
        };
      });
      return { price: newNddPrice, composition: newCompositions };
    } catch (error) {
      // Handle any errors that occur during the update process
      console.error('Error getUpdatePortioning details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }
  async getRecipeUpdateAfterComponentUpdate(id: any) {
    try {
      const recipes = await this.recipeModel.find({
        'composition.component_id': new mongoose.Types.ObjectId(id),
      });

      ////////////////////////Approval flow////////////////////////////////////
      await this.recipeModel.updateMany(
        {
          'composition.component_id': new mongoose.Types.ObjectId(id),
          $or: [
            { status: 'approved' },
            //  { status: 'not_approved' }
          ],
        },
        { status: 'finalized' },
        // { _id: 1 },
      );
      // console.log('recipeData length', recipes.length);
      //////////////////////////////////////////////////////////////////////////

      if (!recipes.length) {
        return; // No recipes found
      }
      interface MasterDataItem {
        value: {
          key: string;
          is_vegetarian: boolean;
        };
      }
      const masterData: MasterDataItem[] = await this.masterDataModel.find({
        key: 'composition_type',
        is_active: true,
      });
      const updatedRecipes = recipes.map(async (recipe: any) => {
        const proteinTypes =
          recipe?.protein_size?.length > 0 ? recipe?.protein_size : proteinSize;
        // console.log('singleRecipe name====>', `"${recipe.dish_name}"`);
        let totalProteinTypeData = recipe.composition
          .filter((item: any) => item.type.indexOf('Protein') > -1)
          .map((item: any) => item);

        if (totalProteinTypeData.length == 0) {
          totalProteinTypeData = [
            {
              type: 'Standard',
            },
          ];
        }
        const allergens = [];
        const diet_type = [];
        const componentProteinTypes = [];
        const proteinTypeTotals = {};
        const updatedComponents = await Promise.all(
          recipe.composition.map(async (component: any) => {
            const componentData = await this.componentModel.findById(
              component.component_id,
            );
            if (componentData.allergens.length > 0) {
              allergens.push(...componentData.allergens);
            }
            if (componentData.diet_type.length > 0) {
              diet_type.push(...componentData.diet_type);
            }
            if (
              !componentData?.composition?.length ||
              !componentData?.composition
            ) {
              return component; // Skip non-matching components
            }
            const totals = componentData.composition.reduce(
              (acc: any, comp: any) => {
                acc.componentStdPrice += Number(comp?.price) || 0;
                acc.totalKcal += Number(comp?.kcal) || 0;
                acc.totalFat += Number(comp?.fat) || 0;
                acc.totalProtein += Number(comp?.protein) || 0;
                acc.totalCarb += Number(comp?.carb) || 0;
                return acc;
              },
              {
                componentStdPrice: 0,
                totalKcal: 0,
                totalFat: 0,
                totalProtein: 0,
                totalCarb: 0,
              },
            );

            const calculatedWeight =
              (componentData?.use_calculated_weight ||
                componentData?.manual_weight == 0
                ? Number(componentData?.calculated_weight)
                : Number(componentData?.manual_weight)) || 1;

            const componentPrices: { [key: string]: number } = {};
            const componentKcal: { [key: string]: number } = {};
            const componentCarb: { [key: string]: number } = {};
            const componentFat: { [key: string]: number } = {};
            const componentProtein: { [key: string]: number } = {};
            // let componentNutrition: { [key: string]: number } = {};
            const componentProteinCategory =
              component.protein_category || proteinCategory;

            proteinTypes.forEach((type: string) => {
              componentPrices[type] =
                setRounded(
                  (Number(component[type]) * totals.componentStdPrice) /
                  calculatedWeight,
                ) || 0;
              componentKcal[type] =
                setRounded(
                  (Number(component[type]) * totals.totalKcal) /
                  calculatedWeight,
                ) || 0;
              componentCarb[type] =
                setRounded(
                  (Number(component[type]) * totals.totalCarb) /
                  calculatedWeight,
                ) || 0;
              componentFat[type] =
                setRounded(
                  (Number(component[type]) * totals.totalFat) /
                  calculatedWeight,
                ) || 0;
              componentProtein[type] =
                setRounded(
                  (Number(component[type]) * totals.totalProtein) /
                  calculatedWeight,
                ) || 0;
            });
            const portioningBalance = [];

            await Promise.all(
              totalProteinTypeData.map(
                async (proteinData: { type: any; component_id: any }) => {
                  const proteinType =
                    proteinData.type === 'Standard'
                      ? 'Standard'
                      : proteinData.type.split('-')[1]?.trim();
                  if (
                    component.type.indexOf('Protein') === -1 ||
                    (proteinData.type == component.type &&
                      component.type.indexOf('Protein') > -1)
                  ) {
                    await Promise.all(
                      componentProteinCategory.map(
                        async (portioningCategory: any) => {
                          await Promise.all(
                            proteinTypes.map(async (type) => {
                              const portioningDetails =
                                component.portioning_balance?.find(
                                  (item: {
                                    protein_category: string;
                                    protein_type: any;
                                    type: string;
                                  }) =>
                                    item.protein_type === proteinType &&
                                    item.type === type &&
                                    item.protein_category ===
                                    portioningCategory,
                                );
                              let netQty =
                                Number(portioningDetails?.net_qty) ||
                                Number(component[type]);

                              const proteinPrice =
                                (netQty * totals.componentStdPrice) /
                                calculatedWeight;
                              const proteinNutritionKcal =
                                (netQty * totals.totalKcal) / calculatedWeight;
                              const proteinNutritionFat =
                                (netQty * totals.totalFat) / calculatedWeight;
                              const proteinNutritionCarb =
                                (netQty * totals.totalCarb) / calculatedWeight;
                              const proteinNutritionProtein =
                                (netQty * totals.totalProtein) /
                                calculatedWeight;
                              const proteinIsFinalized =
                                portioningDetails?.is_finalized;

                              /////////// Veg Large Conditions//////////////
                              let checkVegLarge = false;
                              if (type == 'extra_large') {
                                const checkVeg = masterData.find(
                                  (item) =>
                                    item.value.key ==
                                    `Protein - ${proteinType}`,
                                );

                                if (checkVeg?.value?.is_vegetarian) {
                                  netQty = 0;
                                  checkVegLarge = true;
                                }
                              }
                              console.log('component', portioningDetails);
                              if (!checkVegLarge) {
                                portioningBalance.push({
                                  net_qty: netQty || 0,
                                  protein_type: proteinType,
                                  type,
                                  protein_category: portioningCategory,
                                  price: setRounded(proteinPrice) || 0,
                                  kcal: setRounded(proteinNutritionKcal) || 0,
                                  fat: setRounded(proteinNutritionFat) || 0,
                                  carb: setRounded(proteinNutritionCarb) || 0,
                                  protein:
                                    setRounded(proteinNutritionProtein) || 0,
                                  is_finalized: proteinIsFinalized,
                                  // Use only portioning_balance flags; do not fall back to component-level defaults
                                  is_main: portioningDetails?.is_main ?? false,
                                  is_inside: portioningDetails?.is_inside ?? false,
                                  is_separate: portioningDetails?.is_separate ?? false,
                                  packaging_material:
                                    (await convertToObjectId(
                                      portioningDetails?.packaging_material,
                                    )) || null,
                                  material: portioningDetails?.material || '',
                                  description:
                                    portioningDetails?.description || '',
                                  instruction:
                                    portioningDetails?.instruction || '',
                                });
                              }

                              ////////////////////For AVG price and weight calculation////////////////
                              if (!proteinTypeTotals[portioningCategory]) {
                                proteinTypeTotals[portioningCategory] = {};
                              }

                              if (
                                !proteinTypeTotals[portioningCategory][
                                proteinType
                                ]
                              ) {
                                proteinTypeTotals[portioningCategory][
                                  proteinType
                                ] = {
                                  totalPrice: 0,
                                  totalWeight: 0,
                                  sizes: new Set(),
                                };
                              }

                              proteinTypeTotals[portioningCategory] =
                                proteinTypeTotals[portioningCategory] || {};

                              proteinTypeTotals[portioningCategory][
                                proteinType
                              ] = proteinTypeTotals[portioningCategory][
                              proteinType
                              ] || { sizes: {} };

                              proteinTypeTotals[portioningCategory][
                                proteinType
                              ].sizes[type] = proteinTypeTotals[
                                portioningCategory
                              ][proteinType].sizes[type] || {
                                  totalPrice: 0,
                                  totalWeight: 0,
                                };

                              proteinTypeTotals[portioningCategory][
                                proteinType
                              ].totalPrice += proteinPrice || 0;
                              proteinTypeTotals[portioningCategory][
                                proteinType
                              ].totalWeight += netQty || 0;
                              proteinTypeTotals[portioningCategory][
                                proteinType
                              ].sizes[type].totalPrice += proteinPrice || 0;
                              proteinTypeTotals[portioningCategory][
                                proteinType
                              ].sizes[type].totalWeight += netQty || 0;
                            }),
                            //////////////////////////////////////////////////////////////
                          );
                        },
                      ),
                    );
                  }
                },
              ),
            );
            return {
              ...component,
              component_id: await convertToObjectId(component.component_id),
              packaging_material: await convertToObjectId(
                component.packaging_material,
              ),
              price: componentPrices,
              kcal: componentKcal,
              carb: componentCarb,
              fat: componentFat,
              protein: componentProtein,
              protein_category: componentProteinCategory,
              portioning_balance: portioningBalance || [],
            };
          }),
        );
        // Calculate average prices and add to componentProteinTypes
        for (const portioningCategory in proteinTypeTotals) {
          for (const proteinType in proteinTypeTotals[portioningCategory]) {
            const { totalPrice, totalWeight, sizes } =
              proteinTypeTotals[portioningCategory][proteinType];
            const sizeKeys = Object.keys(sizes);
            const count = sizeKeys.reduce(
              (acc, size) => acc + (sizes[size].totalPrice > 0 ? 1 : 0),
              0,
            );
            const sizePrices = sizeKeys.reduce((acc, size) => {
              acc[size] = setRounded(sizes[size].totalPrice);
              return acc;
            }, {});

            const sizeWeights = sizeKeys.reduce((acc, size) => {
              acc[size] = setRounded(sizes[size].totalWeight);
              return acc;
            }, {});

            const averagePrice = count > 0 ? totalPrice / count : 0;
            const averageWeight = count > 0 ? totalWeight / count : 0;

            componentProteinTypes.push({
              protein_category: portioningCategory,
              protein_type: proteinType,
              average_price: setRounded(averagePrice),
              average_weight: setRounded(averageWeight),
              size_prices: sizePrices,
              size_weights: sizeWeights,
            });
          }
        }
        // Prepare data for recipeDto.price
        const nddPrice = recipe?.price || [];
        const newNddPrice = componentProteinTypes.map((ele) => {
          const oldNddPrice = nddPrice?.find(
            (elePrice: { protein_type: any }) =>
              elePrice.protein_type == ele.protein_type,
          );

          return {
            protein_type: ele.protein_type,
            protein_category: ele.protein_category,
            price: oldNddPrice?.price || 0,
            average_price: ele.average_price,
            average_weight: ele.average_weight,
            size_prices: ele.size_prices,
            size_weights: ele.size_weights,
          };
        });

        // console.log('Average', componentProteinTypes);
        const RecipeData = {
          composition: updatedComponents,
          price: newNddPrice,
          allergens: [...new Set(allergens)],
          diet_type: [...new Set(diet_type)],
        };
        await this.recipeModel.updateOne({ _id: recipe._id }, RecipeData, {
          new: true,
        });
        console.log('Updated recipe:', recipe.dish_name);
      });

      await Promise.all(updatedRecipes);
    } catch (error) {
      // Handle any errors that occur during the update process
      console.error(
        'Error getRecipeUpdateAfterComponentUpdate details:',
        error,
      );
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async getSubRecipePlusComponentUpdateAfterUpdate(id: any, type: string) {
    try {
      // console.log('update id-->', type, id);
      const subRecipeData = await this.componentModel.find({
        [`composition.${type}`]: new mongoose.Types.ObjectId(id),
      });
      // console.log('subRecipeData', subRecipeData.length);

      ////////////////////////////Approval Flow ////////////////////////////////////
      async function checkRecipesForSubRecipe(
        ID: any,
        componentModel: any,
        recipeModel: any,
      ) {
        // console.log('id for sub recipe', ID);
        const compositionIds = await componentModel.find({
          [`composition.${type}`]: { $in: ID },
        });
        const subRecipeArray = compositionIds?.filter(
          (comp: any) => comp.recipe_type == 'sub-recipe',
        );
        const componentArray = compositionIds?.filter(
          (comp: any) => comp.recipe_type == 'component',
        );
        const componentIds = [];
        componentArray?.filter((itm: any) => {
          componentIds?.push(new mongoose.Types.ObjectId(itm?._id));
        });
        const subRecipeIds = [];
        subRecipeArray?.filter((itm: any) => {
          subRecipeIds?.push(new mongoose.Types.ObjectId(itm?._id));
        });

        await recipeModel.updateMany(
          {
            'composition.component_id': { $in: componentIds },
            $or: [
              { status: 'approved' },
              //  { status: 'not_approved' }
            ],
          },
          { status: 'finalized' },
          // { _id: 1 },
        );
        if (subRecipeIds?.length > 0) {
          checkRecipesForSubRecipe(subRecipeIds, componentModel, recipeModel);
        }
      }

      await checkRecipesForSubRecipe(
        [new mongoose.Types.ObjectId(id)],
        this.componentModel,
        this.recipeModel,
      );
      ///////////////////////////////////////////////////////////////////////////
      if (!subRecipeData.length) {
        return; // No sub-recipes found
      }

      /////////////////////////////////////////update components according Ingredient or sub recipe changes////////////////

      await Promise.all(
        subRecipeData.map(async (singleComponent: any) => {
          if (!singleComponent?.composition || !singleComponent) {
            return { ...singleComponent, allergens: [], diet_type: [] };
          }
          let totalCalculatedWeight = 0;
          let totalCalculatedPrice = 0;
          const allergens = [];
          const diet_type = [];
          // console.log(
          //   'start updateComponent ====>',
          //   `"${singleComponent?.name}"`,
          //   singleComponent?._id,
          // );

          const updatedComposition = await Promise.all(
            await singleComponent?.composition
              // .filter(
              //   (compositionItem: null) =>
              //     compositionItem !== null && compositionItem !== undefined,
              // )
              .map(async (compositionItem: any) => {
                if (!compositionItem) {
                  console.log('No composition');
                  return;
                }

                let response: any;
                if (
                  compositionItem?.ingredient_id &&
                  compositionItem?.ingredient_id !== ''
                ) {
                  response = await this.updateIngredientSubRecipe(
                    compositionItem,
                    id,
                  );
                } else if (
                  compositionItem?.component_id &&
                  compositionItem?.component_id !== ''
                ) {
                  response = await this.updateComponentSubRecipe(
                    compositionItem,
                    id,
                  );
                }

                totalCalculatedWeight += Number(response.net_qty);
                totalCalculatedPrice += Number(response.net_price);
                allergens.push(...response?.allergens);
                diet_type.push(...response?.diet_type);
                return response?.updatedItem;
              }),
          );

          singleComponent.composition = updatedComposition;
          singleComponent.calculated_weight = setRounded(totalCalculatedWeight);
          singleComponent.calculated_price = setRounded(totalCalculatedPrice);
          singleComponent.allergens = [...new Set(allergens)];
          singleComponent.diet_type = [...new Set(diet_type)];

          // console.log(
          //   '================================',
          //   singleComponent?.name,
          // singleComponent.diet_type,
          // );
          await this.componentModel.updateOne(
            { _id: singleComponent._id },
            singleComponent,
            { new: true },
          );

          console.log(
            'End updateComponent',
            `"${singleComponent?.name}"`,
            'recipe_type',
            `"${singleComponent?.recipe_type}"`,
          );

          await this.getSubRecipePlusComponentUpdateAfterUpdate(
            singleComponent._id,
            'component_id',
          );
          await this.getRecipeUpdateAfterComponentUpdate(singleComponent._id);
        }),
      );

      // await Promise.all(await subRecipeData.map(updateSubRecipe));
    } catch (error) {
      console.error(
        'Error getSubRecipePlusComponentUpdateAfterUpdate details:',
        error,
      );
      throw error; // Rethrow the error to be caught by the caller
    }
  }
  async updateComponentSubRecipe(compositionItem: any, id: string) {
    try {
      const allergens = [];
      const diet_type = [];
      const componentData = await this.componentModel.findById(
        compositionItem.component_id,
      );
      // if (componentData?.allergens?.length > 0) {
      //   allergens.push(...componentData.allergens);
      // }
      // if (componentData?.diet_type?.length > 0) {
      //   allergens.push(...componentData.diet_type);
      // }
      if (componentData) {
        if (
          Array.isArray(componentData.allergens) &&
          componentData.allergens.length > 0
        ) {
          allergens.push(...componentData.allergens);
        }
        if (
          Array.isArray(componentData.diet_type) &&
          componentData.diet_type.length > 0
        ) {
          diet_type.push(...componentData.diet_type);
        }
        // if (
        //   compositionItem.component_id?.toString() !== id.toString() ||
        //   !componentData?.composition?.length ||
        //   !componentData?.composition
        // ) {
        //   return {
        //     updatedItem: compositionItem,
        //     allergens,
        //     diet_type,
        //     net_qty: 0,
        //     net_price: 0,
        //   }; // Skip non-matching components
        // }
        // console.log(
        //   'componentData.composition----------->',
        //   componentData.name,
        // );
        const totals = componentData.composition.reduce(
          (acc: any, comp: any) => {
            acc.componentStdPrice += Number(comp?.price) || 0;
            acc.totalKcal += Number(comp?.kcal) || 0;
            acc.totalFat += Number(comp?.fat) || 0;
            acc.totalProtein += Number(comp?.protein) || 0;
            acc.totalCarb += Number(comp?.carb) || 0;
            return acc;
          },
          {
            componentStdPrice: 0,
            totalKcal: 0,
            totalFat: 0,
            totalProtein: 0,
            totalCarb: 0,
          },
        );
        const calculatedWeight = Number(componentData.calculated_weight) || 1;
        const netQty = Number(compositionItem?.net_qty) || 0;
        const waste = Number(compositionItem?.waste) || 0;

        let componentPrice =
          (netQty * totals.componentStdPrice) / calculatedWeight;
        if (waste > 0) {
          componentPrice = (componentPrice * 100) / (100 - waste);
        }

        const calculateNutrient = (totalNutrient: number) =>
          (netQty * totalNutrient) / calculatedWeight;

        const updatedItem = {
          ...compositionItem,
          component_id: compositionItem.component_id
            ? await convertToObjectId(compositionItem.component_id)
            : compositionItem.component_id,
          packaging_material: compositionItem?.packaging_material
            ? await convertToObjectId(compositionItem?.packaging_material)
            : compositionItem?.packaging_material,
          price: setRounded(componentPrice),
          kcal: setRounded(calculateNutrient(totals.totalKcal)),
          fat: setRounded(calculateNutrient(totals.totalFat)),
          carb: setRounded(calculateNutrient(totals.totalCarb)),
          protein: setRounded(calculateNutrient(totals.totalProtein)),
        };

        return {
          updatedItem,
          allergens,
          diet_type,
          net_qty: netQty,
          net_price: setRounded(componentPrice),
        };
      }
      return {
        updatedItem: compositionItem,
        allergens,
        diet_type,
        net_qty: 0,
        net_price: 0,
      };
    } catch (error) {
      console.error('Error updateComponentSubRecipe details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }

  async updateIngredientSubRecipe(compositionItem: any, id: any) {
    try {
      const allergens = [];
      const diet_type = [];
      const ingredientData = await this.ingredientModel.findById(
        compositionItem.ingredient_id,
      );
      if (
        Array.isArray(ingredientData?.allergens) &&
        ingredientData?.allergens.length > 0
      ) {
        allergens.push(...ingredientData.allergens);
      }
      if (
        Array.isArray(ingredientData?.diet_type) &&
        ingredientData?.diet_type.length > 0
      ) {
        diet_type.push(...ingredientData.diet_type);
      }

      // if (compositionItem.ingredient_id?.toString() !== id.toString()) {
      //   compositionItem.ingredient_id = await convertToObjectId(
      //     compositionItem?.ingredient_id,
      //   );
      //   return {
      //     updatedItem: compositionItem,
      //     allergens,
      //     diet_type,
      //     net_qty: 0,
      //     net_price: 0,
      //   }; // Skip non-matching ingredients
      // }

      if (!ingredientData) {
        console.error('Ingredient not found:', compositionItem.ingredient_id);
        compositionItem.ingredient_id = await convertToObjectId(
          compositionItem?.ingredient_id,
        );
        return {
          updatedItem: compositionItem,
          allergens,
          diet_type,
          net_qty: 0,
          net_price: 0,
        };
      }

      // console.log('Ingredient inner', `"${ingredientData?.name}"`);

      const supplierData = ingredientData.supplier_details?.find(
        (item: { supplier_pref: number }) => item.supplier_pref == 1,
      );

      let ingredientStdPrice = Number(
        supplierData?.single_package?.per_kg_price || 0,
      );
      const waste = Number(ingredientData?.waste) || 0;
      const compositionNetQty = Number(compositionItem?.net_qty) || 0;
      if (waste > 0) {
        ingredientStdPrice = (ingredientStdPrice * 100) / (100 - waste);
      }

      let componentPrice = 0;
      const wasteFactor =
        compositionItem?.waste > 0
          ? (100 - Number(compositionItem?.waste)) / 100
          : 1;
      if (compositionItem.unit === 'g') {
        componentPrice = (ingredientStdPrice * compositionNetQty) / 1000;
        componentPrice /= wasteFactor;
      }

      const calculateNutrient = (ingredientNutrient: number) =>
        (ingredientNutrient * compositionNetQty) / 100;

      const updatedItem = {
        ...compositionItem,
        ingredient_id: await convertToObjectId(compositionItem?.ingredient_id),
        price: setRounded(componentPrice) || 0,
        kcal:
          setRounded(calculateNutrient(ingredientData?.nutrition?.kcal || 0)) ||
          0,
        fat:
          setRounded(calculateNutrient(ingredientData?.nutrition?.fat || 0)) ||
          0,
        carb:
          setRounded(calculateNutrient(ingredientData?.nutrition?.carb || 0)) ||
          0,
        protein:
          setRounded(
            calculateNutrient(ingredientData?.nutrition?.protein || 0),
          ) || 0,
      };

      // totalCalculatedWeight += compositionNetQty;
      return {
        updatedItem,
        allergens,
        diet_type,
        net_qty: compositionNetQty,
        net_price: setRounded(componentPrice),
      };
    } catch (error) {
      console.error('Error updateIngredientSubRecipe details:', error);
      throw error; // Rethrow the error to be caught by the caller
    }
  }
}

@Injectable()
export class RMSHistoryService {
  constructor(
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('History')
    private readonly historyModel: Model<HistoryDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('Recipes_Detail')
    private readonly recipeModel: Model<RecipeDocument>,
  ) { }

  // async recipeHistory(
  //   updatedRecipe: any,
  //   previousRecipeData: any,
  //   type: string,
  //   endPoint: string,
  //   model: string,
  // ) {
  //   // const updatedKeys = diff(previousRecipeData, updatedRecipe);

  //   if (
  //     model == 'recipe' ||
  //     model == 'ingredient' ||
  //     model == 'component' ||
  //     model == 'sub-recipe'
  //   ) {
  //     const changes = compareObjects(
  //       JSON.parse(JSON.stringify(previousRecipeData)),
  //       JSON.parse(JSON.stringify(updatedRecipe)),
  //     );

  //     // console.log('changes in object==>', changes);

  //     await this.historyModel.create({
  //       user_id: 'user1',
  //       model_name: 'Recipe',
  //       action: type,
  //       changes: changes || [],
  //       end_point: endPoint || '',
  //       before_changes: {},
  //       current_changes: {},
  //     });
  //   } else if (model == 'masterdata') {
  //     // let previousData = await this.
  //   }
  //   // console.log('recipe id and updatedRecipe', updatedKeys);
  // }
}

export function handleDubai11Time(data: number): string {
  const plusDate = data || 2;
  const todayDate = moment(new Date())
    .utcOffset(240)
    .format('YYYY-MM-DD HH:mm:ss');
  const dateUpdate = new Date(todayDate);

  if (
    dateUpdate.getHours() <
    Number(process.env.CUTOFF_TIME_COOLER_BAG_PICKUP_DELIVERY || 9)
  ) {
    dateUpdate.setDate(dateUpdate.getDate() + plusDate);
  } else {
    dateUpdate.setDate(dateUpdate.getDate() + plusDate + 1);
  }

  return moment(dateUpdate).startOf('day').toISOString();
}

export async function handlePayloadAdminHistory(user: any, data: any) {
  console.log('data in admin history ', data);
  return;
}

export function minimum11AmCutoff() {
  const nowDubaiTime = moment().tz('Asia/Dubai'); // Current time in Dubai
  const cutoffTime = nowDubaiTime
    .clone()
    .set(
      'hours',
      Number(process.env.CUTOFF_TIME_COOLER_BAG_PICKUP_DELIVERY || 9),
    )
    .set('minutes', 0)
    .set('seconds', 0); // 11 AM Dubai time

  // Determine the minimum accessible date
  const minAccessibleDate = nowDubaiTime.isBefore(cutoffTime)
    ? nowDubaiTime.clone().add(1, 'day').startOf('day') // Before 11 AM, next day is accessible
    : nowDubaiTime.clone().add(2, 'days').startOf('day'); // After 11 AM, the day after next is accessible

  return minAccessibleDate;
}
