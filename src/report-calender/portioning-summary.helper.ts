import * as moment from 'moment';
import { formatPlatingDate } from './report-summary.helper';

export type PortioningComponent = {
    name: string;
    value?: number;
    protein_category?: string;
    extra_small?: number;
    small?: number;
    medium?: number;
    large?: number;
    extra_large?: number;
    OneSize?: number;
    Extra_small?: number;
    Small?: number;
    Medium?: number;
    Large?: number;
    Extra_large?: number;
};

export type PortioningVariant = {
    name: string;
    count?: number;
    components: PortioningComponent[];
    extra_small?: number;
    small?: number;
    medium?: number;
    large?: number;
    extra_large?: number;
    OneSize?: number;
    Extra_small?: number;
    Small?: number;
    Medium?: number;
    Large_large?: number;
    [key: string]: any;
};

export type PortioningDishRow = {
    id: string;
    name: string;
    count: number;
    variants: PortioningVariant[];
    [key: string]: any;
};

export function normalizePortioningReportType(type: string) {
    const value = String(type ?? '').trim().toLowerCase();
    if (value === 'snacks' || value === 'snak') {
        return 'snack';
    }
    return value;
}

export function getPortioningReportPhaseLabel(phase: string) {
    const value = String(phase ?? '').trim();
    if (value === 'Batch1' || value.toUpperCase() === 'MP') {
        return 'MP';
    }
    if (value.toUpperCase() === 'NDD') {
        return 'NDD';
    }
    return value;
}

function parseQty(value: any) {
    return parseInt(String(value || 0), 10) || 0;
}

function parseGram(value: any) {
    return parseFloat(String(value || 0)) || 0;
}

export function buildDumpRecipeLookupMap(dumpRecipe: any[]) {
    const map = new Map<string, any>();

    for (const row of dumpRecipe || []) {
        const id = row?._id?.toString?.() ?? String(row?._id ?? '');
        const recipeId = row?.recipe_id?.toString?.() ?? String(row?.recipe_id ?? '');

        if (id) {
            map.set(id, row);
        }
        if (recipeId && recipeId !== id) {
            map.set(recipeId, row);
        }
    }

    return map;
}

function getDumpRecipeComponents(
    item: any,
    dumpRecipeById: Map<string, any>,
) {
    if (item?.variants?.components?.length) {
        return item.variants.components;
    }

    const recipeId = item?._id?.toString?.() ?? String(item?._id ?? '');
    const dump = dumpRecipeById.get(recipeId);

    return dump?.composition ?? [];
}

function mapSubscriptionComponents(
    componentData: any[],
    proteinCategory: string,
    mealSize?: string,
) {
    return (componentData || []).map((compItm) => {
        if (mealSize) {
            return {
                name: compItm?.name,
                [mealSize]: parseGram(compItm?.net_qty),
                protein_category: compItm?.protein_category ?? proteinCategory,
            };
        }

        return {
            name: compItm?.name,
            value: parseGram(compItm?.net_qty),
            protein_category: compItm?.protein_category ?? proteinCategory,
        };
    });
}

function mapNddComponents(item: any, mealSize?: string) {
    const components: PortioningComponent[] = [];

    for (let i = 1; i <= 9; i += 1) {
        const name = item?.variants?.[`component${i}`];
        const weight = item?.variants?.[`component${i}_weight`];
        if (!name || weight === '' || weight === undefined) continue;

        if (mealSize) {
            components.push({
                name,
                [mealSize]: parseGram(weight),
            });
        } else {
            components.push({
                name,
                value: parseGram(weight),
            });
        }
    }

    return components;
}

function getMealCategorySizeKey(item: any) {
    const size = item?.variants?.size;
    const category = item?.variants?.protein_category;

    if (category === 'high') return [`high_${size}`];
    if (category === 'low') return [`low_${size}`];
    if (category === 'pcos') return [`pcos_${size}`];
    if (category === 'diabetes') return [`diabetes_${size}`];
    return [`balance_${size}`];
}

function incrementProteinCount(row: PortioningDishRow, proteinCategory: string) {
    if (!proteinCategory) return;
    if (row[proteinCategory]) {
        row[proteinCategory] += 1;
    } else {
        row[proteinCategory] = 1;
    }
}

function mergeSubscriptionComponents(
    existing: PortioningComponent[],
    incoming: PortioningComponent[],
    mealSize?: string,
) {
    for (const compItm of incoming) {
        const indexOfComponent = existing.findIndex(
            (variant) =>
                variant.name === compItm.name &&
                variant.protein_category === compItm.protein_category,
        );

        if (indexOfComponent === -1) {
            existing.push(compItm);
            continue;
        }

        if (mealSize && compItm[mealSize] !== undefined) {
            existing[indexOfComponent][mealSize] = compItm[mealSize];
        }
    }
}

function groupPortioningSimpleMeals(
    list: any[],
    dumpRecipeById: Map<string, any>,
    options: { useQty?: boolean; getId?: (item: any) => string; getName?: (item: any) => string },
) {
    const rowById = new Map<string, PortioningDishRow>();
    const variantIndexByDish = new Map<string, Map<string, number>>();
    let variantCount = 0;

    for (const item of list) {
        if (!item) continue;

        const id = options.getId?.(item) ?? item?._id?.toString?.();
        const name = options.getName?.(item) ?? item?.dish_name ?? '';
        const qty = options.useQty ? parseQty(item?.qty) : 1;
        const proteinCategory = item?.variants?.protein_category ?? '';
        const variantName = item?.variants?.protein_option ?? '';
        const componentData = options.useQty
            ? mapNddComponents(item)
            : mapSubscriptionComponents(
                  getDumpRecipeComponents(item, dumpRecipeById),
                  proteinCategory,
              );

        let row = rowById.get(id);

        if (!row) {
            variantCount += qty;
            row = {
                id,
                name,
                count: qty,
                variants: [
                    {
                        name: variantName,
                        components: [...componentData],
                    },
                ],
            };
            incrementProteinCount(row, proteinCategory);
            rowById.set(id, row);
            variantIndexByDish.set(id, new Map([[variantName, 0]]));
            continue;
        }

        row.count += qty;
        incrementProteinCount(row, proteinCategory);

        const variantMap = variantIndexByDish.get(id)!;
        let variantIndex = variantMap.get(variantName);

        if (variantIndex === undefined) {
            variantCount += qty;
            variantIndex = row.variants.length;
            variantMap.set(variantName, variantIndex);
            row.variants.push({
                name: variantName,
                components: [...componentData],
            });
        } else if (!options.useQty) {
            mergeSubscriptionComponents(
                row.variants[variantIndex].components,
                componentData,
            );
        } else {
            const components = row.variants[variantIndex].components;
            for (const comp of componentData) {
                const componentIndex = components.findIndex(
                    (row) => row.name === comp.name,
                );
                if (componentIndex === -1) {
                    components.push(comp);
                }
            }
        }
    }

    return { rows: Array.from(rowById.values()), count: variantCount };
}

function groupPortioningMeals(list: any[], dumpRecipeById: Map<string, any>) {
    const rowById = new Map<string, PortioningDishRow>();
    const variantIndexByDish = new Map<string, Map<string, number>>();
    let variantCount = 0;

    for (const item of list) {
        if (!item) continue;

        const id = item?._id?.toString?.();
        const proteinCategory = item?.variants?.protein_category || 'balance';
        const mealSize = item?.variants?.size;
        const categorySizeKey = `${proteinCategory}_${mealSize}`;
        const variantName = item?.variants?.protein_option ?? '';
        const componentData = mapSubscriptionComponents(
            getDumpRecipeComponents(item, dumpRecipeById),
            proteinCategory,
            mealSize,
        );

        let row = rowById.get(id);

        if (!row) {
            variantCount += 1;
            row = {
                id,
                name: item?.dish_name ?? '',
                count: 1,
                variants: [
                    {
                        name: variantName,
                        count: 1,
                        [categorySizeKey]: 1,
                        [mealSize]: 1,
                        components: [...componentData],
                    },
                ],
            };
            incrementProteinCount(row, proteinCategory);
            rowById.set(id, row);
            variantIndexByDish.set(id, new Map([[variantName, 0]]));
            continue;
        }

        if (
            proteinCategory === undefined ||
            proteinCategory === null ||
            proteinCategory === 'balance'
        ) {
            row.name = item?.dish_name ?? row.name;
        }

        row.count += 1;
        incrementProteinCount(row, proteinCategory);

        const variantMap = variantIndexByDish.get(id)!;
        let variantIndex = variantMap.get(variantName);

        if (variantIndex === undefined) {
            variantCount += 1;
            variantIndex = row.variants.length;
            variantMap.set(variantName, variantIndex);
            row.variants.push({
                name: variantName,
                count: 1,
                [categorySizeKey]: 1,
                [mealSize]: 1,
                components: [...componentData],
            });
        } else {
            const variant = row.variants[variantIndex];
            variant.count = (variant.count || 0) + 1;
            if (variant[categorySizeKey]) {
                variant[categorySizeKey] += 1;
            } else {
                variant[categorySizeKey] = 1;
            }
            if (variant[mealSize]) {
                variant[mealSize] += 1;
            } else {
                variant[mealSize] = 1;
            }
            mergeSubscriptionComponents(
                variant.components,
                componentData,
                mealSize,
            );
        }
    }

    return { rows: Array.from(rowById.values()), count: variantCount };
}

function groupPortioningNddItems(nddList: any[]) {
    const breakfastList: any[] = [];
    const mealList: any[] = [];
    const snacksList: any[] = [];

    for (const item of nddList) {
        if (item?.meal_category === 'Breakfast') {
            breakfastList.push(item);
        } else if (
            item?.meal_category === 'Meal' ||
            item?.meal_category === 'Add On'
        ) {
            mealList.push(item);
        } else if (item?.meal_category === 'Snack') {
            snacksList.push(item);
        }
    }

    const emptyDumpMap = new Map<string, any>();

    const breakfast = groupPortioningSimpleMeals(breakfastList, emptyDumpMap, {
        useQty: true,
        getId: (item) => item?.recipe_id?.toString?.(),
        getName: (item) => item?.dish_name ?? '',
    });

    const snacks = groupPortioningSimpleMeals(snacksList, emptyDumpMap, {
        useQty: true,
        getId: (item) => item?.recipe_id?.toString?.(),
        getName: (item) => item?.dish_name ?? '',
    });

    const mealRowById = new Map<string, PortioningDishRow>();
    const mealVariantIndexByDish = new Map<string, Map<string, number>>();
    let mealVariantCount = 0;

    for (const item of mealList) {
        const id = item?.recipe_id?.toString?.();
        const mealSize = item?.variants?.size;
        const variantName = item?.variants?.protein_option ?? '';
        const name =
            item?.meal_category === 'Add On'
                ? `${item?.dish_name} (Add On)`
                : item?.dish_name;
        const qty = parseQty(item?.qty);
        const componentData = mapNddComponents(item, mealSize);

        let row = mealRowById.get(id);

        if (!row) {
            mealVariantCount += qty;
            mealRowById.set(id, {
                id,
                name,
                count: qty,
                variants: [
                    {
                        name: variantName,
                        count: qty,
                        [mealSize]: qty,
                        components: componentData,
                    },
                ],
            });
            mealVariantIndexByDish.set(id, new Map([[variantName, 0]]));
            continue;
        }

        row.count += qty;
        const variantMap = mealVariantIndexByDish.get(id)!;
        let variantIndex = variantMap.get(variantName);

        if (variantIndex === undefined) {
            mealVariantCount += qty;
            variantIndex = row.variants.length;
            variantMap.set(variantName, variantIndex);
            row.variants.push({
                name: variantName,
                count: qty,
                [mealSize]: qty,
                components: componentData,
            });
        } else {
            const variant = row.variants[variantIndex];
            variant.count = (variant.count || 0) + qty;
            if (variant[mealSize]) {
                variant[mealSize] += qty;
            } else {
                variant[mealSize] = qty;
            }

            for (const comp of componentData) {
                const componentIndex = variant.components.findIndex(
                    (row) => row.name === comp.name,
                );
                if (componentIndex === -1) {
                    variant.components.push(comp);
                } else if (comp[mealSize] !== undefined) {
                    variant.components[componentIndex][mealSize] = comp[mealSize];
                }
            }
        }
    }

    const mealRows = Array.from(mealRowById.values());

    return {
        breakfastShow: breakfast.rows,
        mealShow: mealRows,
        snackShow: snacks.rows,
        breakfastCount: breakfast.count,
        mealCount: mealVariantCount,
        snackCount: snacks.count,
    };
}

function splitPortioningDeliveryItems(deliveryItems: any[]) {
    const breakfastList: any[] = [];
    const mealList: any[] = [];
    const snacksList: any[] = [];
    const nddList: any[] = [];

    for (const item of deliveryItems) {
        if (item?.meal_type === 'lunch' || item?.meal_type === 'dinner') {
            mealList.push(item?.selected_meal);
        } else if (item?.meal_type === 'breakfast') {
            breakfastList.push(item?.selected_meal);
        } else if (
            item?.meal_type === 'morning_snack' ||
            item?.meal_type === 'evening_snack'
        ) {
            snacksList.push(item?.selected_meal);
        } else {
            nddList.push(item);
        }
    }

    return { breakfastList, mealList, snacksList, nddList };
}

export function buildPortioningSummaryData(params: {
    deliveryDetails?: any[];
    deliveryItems?: any[];
    dumpRecipe: any[];
    date: string;
    phase: string;
}) {
    const { dumpRecipe, date, phase } = params;
    const phaseLabel = getPortioningReportPhaseLabel(phase);
    const dumpRecipeById = buildDumpRecipeLookupMap(dumpRecipe);

    const deliveryItems =
        params.deliveryItems ??
        (params.deliveryDetails ?? []).flatMap(
            (delivery) => delivery?.delivery_item ?? [],
        );

    const { breakfastList, mealList, snacksList, nddList } =
        splitPortioningDeliveryItems(deliveryItems);

    let breakfastShow: PortioningDishRow[] = [];
    let mealShow: PortioningDishRow[] = [];
    let snackShow: PortioningDishRow[] = [];
    let breakfastCount = 0;
    let mealCount = 0;
    let snackCount = 0;

    if (nddList.length > 0) {
        const nddGrouped = groupPortioningNddItems(nddList);
        breakfastShow = nddGrouped.breakfastShow;
        mealShow = nddGrouped.mealShow;
        snackShow = nddGrouped.snackShow;
        breakfastCount = nddGrouped.breakfastCount;
        mealCount = nddGrouped.mealCount;
        snackCount = nddGrouped.snackCount;
    } else {
        const breakfast = groupPortioningSimpleMeals(
            breakfastList,
            dumpRecipeById,
            {},
        );
        const snacks = groupPortioningSimpleMeals(snacksList, dumpRecipeById, {});
        const meals = groupPortioningMeals(mealList, dumpRecipeById);

        breakfastShow = breakfast.rows;
        snackShow = snacks.rows;
        mealShow = meals.rows;
        breakfastCount = breakfast.count;
        snackCount = snacks.count;
        mealCount = meals.count;
    }

    return {
        message: 'Portioning summary report fetched successfully',
        report: {
            title: `Portioning Report List (${phase})`,
            phase,
            phaseLabel,
            deliveryDate: formatPlatingDate(date),
        },
        counts: {
            breakfastCount,
            mealCount,
            snackCount,
        },
        data: {
            breakfastShow,
            mealShow,
            snackShow,
        },
    };
}

const PORTIONING_PROTEIN_CATEGORIES = [
    'balance',
    'low',
    'high',
    'pcos',
    'diabetes',
];

const MEAL_SIZE_KEYS = [
    'extra_small',
    'small',
    'medium',
    'large',
    'extra_large',
] as const;

function escapePortioningHtml(value: string) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatPortioningPdfDate(date: string) {
    return moment(new Date(date.replace(/%20/g, ' '))).format('Do MMMM YYYY');
}

function formatPortioningPdfFileDate(date: string) {
    return moment(new Date(date.replace(/%20/g, ' '))).format('YYYY-MM-DD');
}

export function getPortioningPdfFileName(
    date: string,
    type: string,
    phaseLabel: string,
) {
    return `Portioning_Report(${formatPortioningPdfFileDate(date)})(${type})(${phaseLabel}).pdf`;
}

function formatCategoryLabel(category: string) {
    if (category === 'pcos') return 'PCOS';
    if (category === 'diabetes') return 'Diabetes';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function normalizeProteinCategory(category?: string) {
    return String(category || 'balance').toLowerCase();
}

function getDishCategories(dish: PortioningDishRow) {
    return PORTIONING_PROTEIN_CATEGORIES.filter(
        (category) => Number(dish[category] ?? 0) > 0,
    );
}

function filterComponentsByCategory(
    components: PortioningComponent[],
    category: string,
) {
    return components.filter(
        (component) =>
            normalizeProteinCategory(component.protein_category) === category,
    );
}

function formatGramValue(value: any) {
    const amount = Number(value ?? 0);
    if (!amount) return '0';
    return `${amount} g`;
}

function formatMealCellValue(value: any) {
    const amount = Number(value ?? 0);
    if (!amount) return '0';
    return `${amount} g`;
}

const MEAL_SIZE_LABELS = [
    'EXTRA SMALL',
    'SMALL',
    'MEDIUM',
    'LARGE',
    'EXTRA LARGE',
] as const;

function getMealCategorySizeCounts(
    variant: PortioningVariant,
    category: string,
) {
    const counts: Record<string, number> = {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
    };

    for (const size of MEAL_SIZE_KEYS) {
        const categoryKey = `${category}_${size}`;
        counts[size] = Number(variant[categoryKey] ?? 0);
    }

    return counts;
}

function renderMealSizeValues(values: string[]) {
    return `
    <div class="meal-sizes">
      ${values.map((value) => `<span class="meal-size-cell">${value}</span>`).join('')}
    </div>`;
}

function renderMealRowMeta(label: string, serialNo?: string) {
    if (serialNo === undefined) {
        return `
      <div class="meal-row-meta meal-row-meta-full">
        <span class="meal-row-name">${label}</span>
      </div>`;
    }

    return `
      <div class="meal-row-meta">
        <span class="meal-row-sr">${serialNo}</span>
        <span class="meal-row-name">${label}</span>
      </div>`;
}

function renderMealDataRow(
    meta: { label: string; serialNo?: string },
    sizeValues: string[],
    className = '',
) {
    return `
    <div class="meal-data-row ${className}">
      ${renderMealRowMeta(meta.label, meta.serialNo)}
      ${renderMealSizeValues(sizeValues)}
    </div>`;
}

function renderPortioningItemRow(
    index: number,
    name: string,
    right: string,
    className = '',
) {
    return `
    <div class="portion-row ${className}">
      <div class="portion-row-meta">
        <span class="portion-row-sr">${index + 1}</span>
        <span class="portion-row-name">${escapePortioningHtml(name)}</span>
      </div>
      <span class="portion-right">${right}</span>
    </div>`;
}

function renderPortioningSummaryRow(
    label: string,
    right: string,
    className = '',
) {
    return `
    <div class="portion-row ${className}">
      <div class="portion-row-meta">
        <span class="portion-row-sr"></span>
        <span class="portion-row-name">${label}</span>
      </div>
      <span class="portion-right">${right}</span>
    </div>`;
}

function sumBreakfastWeights(components: PortioningComponent[]) {
    return components.reduce(
        (sum, component) => sum + Number(component.value ?? 0),
        0,
    );
}

function sumMealWeights(components: PortioningComponent[]) {
    const totals: Record<string, number> = {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
        OneSize: 0,
    };

    for (const component of components) {
        for (const size of MEAL_SIZE_KEYS) {
            totals[size] += Number(component[size] ?? 0);
        }
        totals.OneSize += Number(component.OneSize ?? 0);
    }

    return totals;
}

function renderPortioningSplitRow(left: string, right: string, className = '') {
    return `
    <div class="portion-row ${className}">
      <span class="portion-left">${left}</span>
      <span class="portion-right">${right}</span>
    </div>`;
}

function renderCategoryHeaderBand(innerHtml: string) {
    return `<div class="category-header-band">${innerHtml}</div>`;
}

function renderCategoryDataBody(
    itemRowsHtml: string,
    summaryRowsHtml: string,
) {
    return `
    <div class="category-data-body">
      <div class="category-items">${itemRowsHtml}</div>
      <div class="category-summary">${summaryRowsHtml}</div>
    </div>`;
}

function renderBreakfastCategoryBlock(
    dish: PortioningDishRow,
    variant: PortioningVariant,
    category: string,
) {
    const components = filterComponentsByCategory(variant.components, category);
    if (!components.length) return '';

    const categoryCount = Number(dish[category] ?? 0);
    const totalWeight = sumBreakfastWeights(components);

    const itemRows = components
        .map((component, index) =>
            renderPortioningItemRow(
                index,
                component.name,
                escapePortioningHtml(formatGramValue(component.value)),
                'portion-row-item',
            ),
        )
        .join('');

    return `
    <div class="category-block">
      ${renderCategoryHeaderBand(
            renderPortioningSplitRow(
                `${escapePortioningHtml(formatCategoryLabel(category))}: ${categoryCount}`,
                'ONE SIZE',
                'portion-row-category',
            ),
        )}
      ${renderCategoryDataBody(
            itemRows,
            `
        ${renderPortioningSummaryRow(
            'Total Weight',
            escapePortioningHtml(formatGramValue(totalWeight)),
            'portion-row-total-weight',
        )}
        ${renderPortioningSummaryRow(
            'Total Quantity',
            String(categoryCount),
            'portion-row-total-qty',
        )}
      `,
        )}
    </div>`;
}

function renderMealCategoryBlock(
    dish: PortioningDishRow,
    variant: PortioningVariant,
    category: string,
) {
    const components = filterComponentsByCategory(variant.components, category);
    if (!components.length) return '';

    const categoryCount = Number(dish[category] ?? 0);
    const totalWeight = sumMealWeights(components);
    const totalQty = getMealCategorySizeCounts(variant, category);

    const itemRows = components
        .map((component, index) =>
            renderMealDataRow(
                {
                    label: escapePortioningHtml(component.name),
                    serialNo: String(index + 1),
                },
                [
                    formatMealCellValue(component.extra_small),
                    formatMealCellValue(component.small),
                    formatMealCellValue(component.medium),
                    formatMealCellValue(component.large),
                    formatMealCellValue(component.extra_large),
                ],
                'meal-data-row-item',
            ),
        )
        .join('');

    return `
    <div class="category-block meal-category-block">
      ${renderCategoryHeaderBand(
            renderMealDataRow(
                {
                    label: `${escapePortioningHtml(formatCategoryLabel(category))}: ${categoryCount}`,
                },
                [...MEAL_SIZE_LABELS],
                'meal-data-row-category',
            ),
        )}
      ${renderCategoryDataBody(
            itemRows,
            `
        ${renderMealDataRow(
            { label: 'Total Weight', serialNo: '' },
            [
                formatMealCellValue(totalWeight.extra_small),
                formatMealCellValue(totalWeight.small),
                formatMealCellValue(totalWeight.medium),
                formatMealCellValue(totalWeight.large),
                formatMealCellValue(totalWeight.extra_large),
            ],
            'meal-data-row-total-weight',
        )}
        ${renderMealDataRow(
            { label: 'Total Quantity', serialNo: '' },
            [
                String(totalQty.extra_small),
                String(totalQty.small),
                String(totalQty.medium),
                String(totalQty.large),
                String(totalQty.extra_large),
            ],
            'meal-data-row-total-qty',
        )}
      `,
        )}
    </div>`;
}

function renderDishVariantSection(
    dish: PortioningDishRow,
    variant: PortioningVariant,
    deliveryDate: string,
    reportType: 'breakfast' | 'meal' | 'snack',
) {
    const categories = getDishCategories(dish);
    const categoryBlocks = categories
        .map((category) =>
            reportType === 'meal'
                ? renderMealCategoryBlock(dish, variant, category)
                : renderBreakfastCategoryBlock(dish, variant, category),
        )
        .join('');

    if (!categoryBlocks) return '';

    return `
    <section class="dish-section">
      <div class="dish-header-block">
        ${renderPortioningSplitRow(
            `<span class="dish-title">${escapePortioningHtml(dish.name)}</span>`,
            `<span class="dish-variant">${escapePortioningHtml(variant.name)}</span>`,
            'portion-row-dish-title',
        )}
        ${renderPortioningSplitRow('Total Quantity', String(dish.count))}
        ${renderPortioningSplitRow('Production Date', escapePortioningHtml(deliveryDate))}
      </div>
      ${categoryBlocks}
    </section>`;
}

export function buildPortioningPdfHtml(params: {
    dishes: PortioningDishRow[];
    type: string;
    date: string;
}) {
    const reportType = normalizePortioningReportType(params.type);
    const pdfReportType =
        reportType === 'meal'
            ? 'meal'
            : reportType === 'snack'
              ? 'snack'
              : 'breakfast';

    const deliveryDate = formatPortioningPdfDate(params.date);

    const sections = params.dishes
        .flatMap((dish) =>
            (dish.variants || []).map((variant) =>
                renderDishVariantSection(
                    dish,
                    variant,
                    deliveryDate,
                    pdfReportType,
                ),
            ),
        )
        .filter(Boolean)
        .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: Calibri, Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #000000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .dish-section {
      page-break-after: always;
      margin-bottom: 24px;
    }
    .dish-section:last-child {
      page-break-after: auto;
    }
    .dish-header-block {
      margin-bottom: 0;
      padding-bottom: 4px;
      border-bottom: 2px solid #000000;
    }
    .category-header-band {
      border-bottom: 2px solid #000000;
    }
    .category-header-band .portion-row,
    .category-header-band .meal-data-row {
      border-bottom: none;
      margin: 0;
      padding: 8px 0;
      font-size: 11pt;
      font-weight: 700;
    }
    .category-block + .category-block .category-header-band {
      margin-top: 20px;
    }
    .dish-header-block .portion-row {
      padding: 6px 0;
      font-size: 11pt;
      font-weight: 700;
    }
    .dish-title,
    .dish-variant {
      font-size: inherit;
      font-weight: inherit;
    }
    .portion-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: none;
      font-size: 11pt;
    }
    .portion-row-dish-title {
      padding-top: 0;
      border-bottom: none;
    }
    .portion-left {
      text-align: left;
      flex: 1;
    }
    .portion-row-meta {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }
    .portion-row-sr {
      flex: 0 0 28px;
      width: 28px;
      text-align: left;
    }
    .portion-row-name {
      flex: 1;
      text-align: left;
      padding-left: 36px;
    }
    .portion-right {
      text-align: right;
      flex-shrink: 0;
      margin-left: 16px;
    }
    .category-block {
      margin-bottom: 24px;
    }
    .category-data-body {
      border-bottom: 2px solid #000000;
    }
    .category-summary {
      margin-top: 8px;
      border-top: none;
    }
    .portion-row-category {
      font-weight: 700;
    }
    .portion-row-item .portion-row-name {
      font-weight: 400;
    }
    .portion-row-total-weight {
      background: #b2d7ab;
      font-weight: 700;
      border-bottom: none;
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .portion-row-total-qty {
      font-weight: 700;
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .meal-category-block {
      margin-top: 0;
    }
    .meal-data-row {
      display: grid;
      grid-template-columns: 28px minmax(100px, 1fr) repeat(5, 72px);
      column-gap: 8px;
      align-items: center;
      padding: 12px 0;
      border-bottom: none;
      font-size: 11pt;
    }
    .meal-data-row-category {
      font-weight: 700;
      padding: 8px 0;
    }
    .meal-row-meta,
    .meal-sizes {
      display: contents;
    }
    .meal-row-meta-full .meal-row-name {
      grid-column: 1 / 3;
      padding-left: 0;
    }
    .meal-row-sr {
      grid-column: 1;
      text-align: left;
    }
    .meal-row-name {
      grid-column: 2;
      text-align: left;
      padding-left: 12px;
    }
    .meal-size-cell {
      text-align: right;
      font-size: 11pt;
      font-weight: 700;
      white-space: nowrap;
    }
    .meal-data-row-item .meal-size-cell {
      font-weight: 400;
    }
    .meal-data-row-total-weight {
      background: #b2d7ab;
      font-weight: 700;
      border-bottom: none;
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .meal-data-row-total-weight .meal-size-cell {
      font-weight: 700;
    }
    .meal-data-row-total-qty {
      font-weight: 700;
      padding-top: 12px;
      padding-bottom: 12px;
    }
    .meal-data-row-total-qty .meal-size-cell {
      font-weight: 700;
    }
    .category-data-body .portion-row,
    .category-data-body .meal-data-row {
      padding: 5px 0;
    }
    .category-data-body .portion-row-total-weight,
    .category-data-body .portion-row-total-qty,
    .category-data-body .meal-data-row-total-weight,
    .category-data-body .meal-data-row-total-qty {
      padding-top: 7px;
      padding-bottom: 7px;
    }
  </style>
</head>
<body>
  ${sections}
</body>
</html>`;
}
