import * as moment from 'moment';

export function formatKitchenDate(date: string) {
    return moment(new Date(date.replace(/%20/g, ' '))).format('Do MMM YYYY');
}

export function getPhaseLabel(phase: string) {
    return phase === 'Batch1' || phase === 'MP' ? 'MP' : 'NDD';
}

export function buildCsvBase(date: string, phase: string) {
    return [
        { first: 'Report', third: 'Delivery Date' },
        {
            first: `Kitchen Production Summary(${phase})`,
            third: formatKitchenDate(date),
        },
        { first: '' },
        { first: '' },
    ];
}

export function groupBySelectedMeal(list: any[], includeVariants = false) {
    const result: any[] = [];
    let totalCount = 0;

    for (const item of list) {
        if (!item) continue;

        const id = item?._id?.toString();
        const index = result.findIndex((val) => val.id === id);

        totalCount++;

        if (index === -1) {
            const payload: any = {
                id,
                name: item?.dish_name || '',
                count: 1,
            };

            if (includeVariants) {
                payload.variants = [
                    {
                        name: item?.variants?.protein_option || '',
                        count: 1,
                    },
                ];
            }

            result.push(payload);
        } else {
            result[index].count += 1;

            if (includeVariants) {
                const protein = item?.variants?.protein_option || '';
                const variantIndex = result[index].variants.findIndex(
                    (val) => val.name === protein,
                );

                if (variantIndex === -1) {
                    result[index].variants.push({
                        name: protein,
                        count: 1,
                    });
                } else {
                    result[index].variants[variantIndex].count += 1;
                }
            }
        }
    }

    return { rows: result, totalCount };
}

export function groupNddItems(list: any[]) {
    const breakfastShow: any[] = [];
    const mealShow: any[] = [];
    const snacksShow: any[] = [];

    let breakfastCount = 0;
    let mealCount = 0;
    let snackCount = 0;

    for (const item of list) {
        const qty = parseInt(item?.qty || 0);
        const recipeId = item?.recipe_id?.toString();

        if (item?.meal_category === 'Breakfast') {
            const index = breakfastShow.findIndex((val) => val.id === recipeId);
            breakfastCount += qty;

            if (index === -1) {
                breakfastShow.push({
                    id: recipeId,
                    name: item?.dish_name || '',
                    count: qty,
                });
            } else {
                breakfastShow[index].count += qty;
            }
        }

        if (item?.meal_category === 'Meal' || item?.meal_category === 'Add On') {
            const index = mealShow.findIndex((val) => val.id === recipeId);
            const name =
                item?.meal_category === 'Add On'
                    ? `${item?.dish_name} (Add On)`
                    : item?.dish_name;

            mealCount += qty;

            if (index === -1) {
                mealShow.push({
                    id: recipeId,
                    name,
                    count: qty,
                    variants: [
                        {
                            name: item?.variants?.protein_option || '',
                            count: qty,
                        },
                    ],
                });
            } else {
                mealShow[index].count += qty;

                const protein = item?.variants?.protein_option || '';
                const variantIndex = mealShow[index].variants.findIndex(
                    (val) => val.name === protein,
                );

                if (variantIndex === -1) {
                    mealShow[index].variants.push({
                        name: protein,
                        count: qty,
                    });
                } else {
                    mealShow[index].variants[variantIndex].count += qty;
                }
            }
        }

        if (item?.meal_category === 'Snack') {
            const index = snacksShow.findIndex((val) => val.id === recipeId);
            snackCount += qty;

            if (index === -1) {
                snacksShow.push({
                    id: recipeId,
                    name: item?.dish_name || '',
                    count: qty,
                });
            } else {
                snacksShow[index].count += qty;
            }
        }
    }

    return {
        breakfastShow,
        mealShow,
        snacksShow,
        breakfastCount,
        mealCount,
        snackCount,
    };
}

export function buildCsvRows(
    baseRows: any[],
    breakfastShow: any[],
    breakfastCount: number,
    mealShow: any[],
    mealCount: number,
    snacksShow: any[],
    snackCount: number,
) {
    const csvPayload = [...baseRows];

    csvPayload.push({ first: 'BreakFasts', third: breakfastCount });
    csvPayload.push({ first: '' });

    breakfastShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });
    });

    csvPayload.push({ first: '' });
    csvPayload.push({ first: '' });
    csvPayload.push({ first: 'Lunch/Dinner', third: mealCount });
    csvPayload.push({ first: '' });

    mealShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });

        item?.variants?.forEach((variant) => {
            csvPayload.push({
                second: `-${variant.name}`,
                third: variant.count,
            });
        });

        csvPayload.push({ first: '' });
    });

    csvPayload.push({ first: '' });
    csvPayload.push({ first: '' });
    csvPayload.push({ first: 'Snacks', third: snackCount });
    csvPayload.push({ first: '' });

    snacksShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });
    });

    return csvPayload;
}

export function formatPlatingDate(date: string) {
    return moment(new Date(date.replace(/%20/g, ' '))).format('Do MMM YYYY');
}

export function formatPlatingFileNameDate(date: string) {
    return moment(new Date(date.replace(/%20/g, ' '))).format('D MMM YYYY');
}

export type MealSummaryReportKind = 'plating' | 'portioning';

const MEAL_SUMMARY_REPORT_CONFIG: Record<
    MealSummaryReportKind,
    { title: string; filePrefix: string; successMessage: string }
> = {
    plating: {
        title: 'Plating Summary Report',
        filePrefix: 'Plating_Summary_Report',
        successMessage: 'Plating summary report fetched successfully',
    },
    portioning: {
        title: 'Portioning Summary Report',
        filePrefix: 'Portioning_Summary_Report',
        successMessage: 'Portioning summary report fetched successfully',
    },
};

export function getSummaryReportFileName(
    kind: MealSummaryReportKind,
    date: string,
    phaseLabel: string,
) {
    const deliveryDate = formatPlatingFileNameDate(date);
    const { filePrefix } = MEAL_SUMMARY_REPORT_CONFIG[kind];
    return `${filePrefix}(${deliveryDate})(${phaseLabel})`;
}

export function getPlatingSummaryFileName(date: string, phaseLabel: string) {
    return getSummaryReportFileName('plating', date, phaseLabel);
}

export function getPortioningSummaryFileName(date: string, phaseLabel: string) {
    return getSummaryReportFileName('portioning', date, phaseLabel);
}

export type PlatingSizeCounts = {
    extra_small: number;
    small: number;
    medium: number;
    large: number;
    extra_large: number;
};

export type PlatingReportRow = {
    first?: any;
    second?: any;
    third?: any;
    fourth?: any;
    fifth?: any;
    sixth?: any;
    seventh?: any;
    eighth?: any;
};

export function createEmptyPlatingSizes(): PlatingSizeCounts {
    return {
        extra_small: 0,
        small: 0,
        medium: 0,
        large: 0,
        extra_large: 0,
    };
}

export function getPlatingMealSizeKey(item: any): keyof PlatingSizeCounts | null {
    const size = item?.variants?.size ?? item?.size;
    if (!size) return null;

    const normalized = String(size).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
    const map: Record<string, keyof PlatingSizeCounts> = {
        extra_small: 'extra_small',
        xs: 'extra_small',
        small: 'small',
        s: 'small',
        medium: 'medium',
        m: 'medium',
        large: 'large',
        l: 'large',
        extra_large: 'extra_large',
        xl: 'extra_large',
    };

    return map[normalized] ?? null;
}

export function addPlatingSizeCount(
    sizes: PlatingSizeCounts,
    sizeKey: keyof PlatingSizeCounts | null,
    qty: number,
) {
    if (sizeKey) {
        sizes[sizeKey] += qty;
        return;
    }
    sizes.medium += qty;
}

export function totalPlatingSizes(sizes: PlatingSizeCounts) {
    return (
        sizes.extra_small +
        sizes.small +
        sizes.medium +
        sizes.large +
        sizes.extra_large
    );
}

function addPlatingMealSizes(mealRow: any, item: any, qty = 1) {
    if (!mealRow.sizes) {
        mealRow.sizes = createEmptyPlatingSizes();
    }
    addPlatingSizeCount(mealRow.sizes, getPlatingMealSizeKey(item), qty);
    mealRow.count = totalPlatingSizes(mealRow.sizes);
}

function addPlatingVariantSizes(
    mealRow: any,
    protein: string,
    item: any,
    qty = 1,
) {
    if (!mealRow.variants) {
        mealRow.variants = [];
    }

    let variantIndex = mealRow.variants.findIndex((val) => val.name === protein);
    if (variantIndex === -1) {
        mealRow.variants.push({
            name: protein,
            count: 0,
            sizes: createEmptyPlatingSizes(),
        });
        variantIndex = mealRow.variants.length - 1;
    }

    const variant = mealRow.variants[variantIndex];
    addPlatingSizeCount(variant.sizes, getPlatingMealSizeKey(item), qty);
    variant.count = totalPlatingSizes(variant.sizes);
}

export function csvReportRowsToString(rows: PlatingReportRow[]) {
    return rows
        .map((row) =>
            [
                row.first ?? '',
                row.second ?? '',
                row.third ?? '',
                row.fourth ?? '',
                row.fifth ?? '',
                row.sixth ?? '',
                row.seventh ?? '',
                row.eighth ?? '',
            ]
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(','),
        )
        .join('\n');
}

function isPlatingSectionRow(row: PlatingReportRow) {
    const label = String(row.first ?? '');
    return (
        label === 'BreakFasts' ||
        label === 'Lunch/Dinner' ||
        label === 'Snacks'
    );
}

function isPlatingEmptyRow(row: PlatingReportRow) {
    const values = [
        row.first,
        row.second,
        row.third,
        row.fourth,
        row.fifth,
        row.sixth,
        row.seventh,
        row.eighth,
    ];

    return values.every(
        (value) => value === '' || value === null || value === undefined,
    );
}

function pushPlatingEmptyRows(
    csvPayload: PlatingReportRow[],
    count = 1,
) {
    for (let i = 0; i < count; i += 1) {
        csvPayload.push({ first: '' });
    }
}

function platingRowTotal(row: PlatingReportRow) {
    return row.third ?? '';
}

function renderPlatingPdfHeader(row1: PlatingReportRow, row2: PlatingReportRow) {
    return `
    <div class="report-header">
      <div class="report-header-col">
        <div class="report-label">Report</div>
        <div class="report-title">${escapeHtml(String(row2.first ?? ''))}</div>
      </div>
      <div class="report-header-col report-header-col-right">
        <div class="report-label">Delivery Date</div>
        <div class="report-title">${escapeHtml(String(platingRowTotal(row2)))}</div>
      </div>
    </div>`;
}

function renderPlatingQuantitySection(
    title: string,
    total: any,
    items: PlatingReportRow[],
) {
    const rows = items
        .map(
            (row) => `
      <div class="qty-row">
        <span class="qty-index">${escapeHtml(String(row.first ?? ''))}</span>
        <span class="qty-name">${escapeHtml(String(row.second ?? ''))}</span>
        <span class="qty-count">${escapeHtml(String(row.third ?? ''))}</span>
      </div>`,
        )
        .join('');

    return `
    <div class="report-section">
      <div class="section-bar">
        <span>${escapeHtml(title)}</span>
        <span>${escapeHtml(String(total ?? ''))}</span>
      </div>
      <div class="section-subheader qty-row">
        <span class="qty-index"></span>
        <span class="qty-name"></span>
        <span class="qty-count">Quantity</span>
      </div>
      <div class="qty-list">${rows}</div>
    </div>`;
}

function displayPlatingCell(value: any) {
    if (value === '' || value === null || value === undefined) {
        return '';
    }
    return String(value);
}

function renderPlatingMealSection(
    total: any,
    headerRow: PlatingReportRow,
    items: PlatingReportRow[],
) {
    const head = `
      <tr class="meal-columns">
        <th class="meal-col-index"></th>
        <th class="meal-col-name"></th>
        <th>${escapeHtml(String(headerRow.third ?? ''))}</th>
        <th>${escapeHtml(String(headerRow.fourth ?? ''))}</th>
        <th>${escapeHtml(String(headerRow.fifth ?? ''))}</th>
        <th>${escapeHtml(String(headerRow.sixth ?? ''))}</th>
        <th>${escapeHtml(String(headerRow.seventh ?? ''))}</th>
        <th>${escapeHtml(String(headerRow.eighth ?? ''))}</th>
      </tr>`;

    const body = items
        .map((row, rowIndex) => {
            const isVariant = String(row.second ?? '').startsWith('-');
            const nextRow = items[rowIndex + 1];
            const nextIsMain =
                nextRow &&
                !String(nextRow.second ?? '').startsWith('-') &&
                String(nextRow.first ?? '') !== '';
            const isGroupEnd = !nextRow || nextIsMain;
            const rowClass = [
                isVariant ? 'meal-variant' : 'meal-row',
                isGroupEnd ? 'meal-group-end' : '',
            ]
                .filter(Boolean)
                .join(' ');

            return `
      <tr class="${rowClass}">
        <td class="meal-col-index">${escapeHtml(displayPlatingCell(row.first))}</td>
        <td class="meal-col-name">${escapeHtml(String(row.second ?? ''))}</td>
        <td>${escapeHtml(displayPlatingCell(row.third))}</td>
        <td>${escapeHtml(displayPlatingCell(row.fourth))}</td>
        <td>${escapeHtml(displayPlatingCell(row.fifth))}</td>
        <td>${escapeHtml(displayPlatingCell(row.sixth))}</td>
        <td>${escapeHtml(displayPlatingCell(row.seventh))}</td>
        <td class="meal-col-total">${escapeHtml(displayPlatingCell(row.eighth))}</td>
      </tr>`;
        })
        .join('');

    return `
    <div class="report-section meal-section">
      <div class="section-bar">
        <span>Lunch/Dinner</span>
        <span>${escapeHtml(String(total ?? ''))}</span>
      </div>
      <table class="meal-table">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function isPlatingMealSizeHeaderRow(row: PlatingReportRow) {
    return row.third === 'Extra Small';
}

function extractPlatingQuantitySection(
    rows: PlatingReportRow[],
    label: string,
) {
    const start = rows.findIndex((row) => row.first === label);
    if (start === -1) return null;

    const total = rows[start].third ?? '';
    const items: PlatingReportRow[] = [];

    for (let index = start + 1; index < rows.length; index += 1) {
        const row = rows[index];
        if (isPlatingSectionRow(row)) break;
        if (isPlatingEmptyRow(row)) continue;
        if (String(row.third ?? '') === 'Quantity') continue;
        items.push(row);
    }

    return { title: label, total, items };
}

function extractPlatingMealSection(rows: PlatingReportRow[]) {
    const start = rows.findIndex((row) => row.first === 'Lunch/Dinner');
    if (start === -1) return null;

    const total = rows[start].third ?? '';
    let index = start + 1;
    let headerRow: PlatingReportRow | null = null;

    while (index < rows.length && !headerRow) {
        const row = rows[index];
        if (isPlatingSectionRow(row)) return null;
        if (isPlatingMealSizeHeaderRow(row)) {
            headerRow = row;
            index += 1;
            break;
        }
        index += 1;
    }

    if (!headerRow) return null;

    const items: PlatingReportRow[] = [];
    for (; index < rows.length; index += 1) {
        const row = rows[index];
        if (isPlatingSectionRow(row)) break;
        if (isPlatingEmptyRow(row)) continue;
        if (isPlatingMealSizeHeaderRow(row)) continue;
        items.push(row);
    }

    return { total, headerRow, items };
}

export function buildPlatingSummaryPdfHtml(report: { csvReport: PlatingReportRow[] }) {
    const rows = report.csvReport;
    let bodyHtml = '';

    if (rows[0]?.first === 'Report' && rows[1]) {
        bodyHtml += renderPlatingPdfHeader(rows[0], rows[1]);
    }

    const breakfast = extractPlatingQuantitySection(rows, 'BreakFasts');
    const lunch = extractPlatingMealSection(rows);
    const snacks = extractPlatingQuantitySection(rows, 'Snacks');

    if (breakfast) {
        bodyHtml += renderPlatingQuantitySection(
            breakfast.title,
            breakfast.total,
            breakfast.items,
        );
    }

    if (lunch) {
        bodyHtml += renderPlatingMealSection(
            lunch.total,
            lunch.headerRow,
            lunch.items,
        );
    }

    if (snacks) {
        bodyHtml += renderPlatingQuantitySection(
            snacks.title,
            snacks.total,
            snacks.items,
        );
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 28px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    .report-header-col-right { text-align: right; }
    .report-label {
      font-size: 10pt;
      color: #333;
      margin-bottom: 6px;
    }
    .report-title {
      font-size: 13pt;
      font-weight: 700;
    }
    .report-section { margin-bottom: 22px; }
    .section-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fff9c4;
      padding: 10px 14px;
      font-weight: 700;
      font-size: 11pt;
    }
    .section-subheader {
      background: #eef2f6;
      font-size: 10pt;
      color: #333;
      border-bottom: none;
    }
    .section-subheader .qty-count {
      font-weight: 400;
    }
    .qty-list { background: #fff; }
    .qty-row {
      display: flex;
      align-items: flex-start;
      padding: 10px 14px;
      border-bottom: 1px solid #f0f0f0;
    }
    .qty-index {
      width: 28px;
      flex-shrink: 0;
    }
    .qty-name {
      flex: 1;
      padding-right: 16px;
    }
    .qty-count {
      min-width: 72px;
      text-align: right;
      font-weight: 700;
      flex-shrink: 0;
    }
    .meal-section { margin-top: 4px; }
    .meal-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      border: none;
    }
    .meal-table th,
    .meal-table td {
      border: none;
      padding: 9px 8px;
      vertical-align: top;
    }
    .meal-table .meal-col-index {
      width: 28px;
      text-align: left;
      padding-left: 4px;
    }
    .meal-table .meal-col-name {
      text-align: left;
      padding-right: 12px;
    }
    .meal-table .meal-columns th {
      color: #9a9a9a;
      font-weight: 400;
      font-size: 10pt;
      text-align: right;
      padding-bottom: 12px;
      padding-top: 14px;
    }
    .meal-table .meal-columns th.meal-col-index,
    .meal-table .meal-columns th.meal-col-name {
      text-align: left;
    }
    .meal-row .meal-col-index,
    .meal-row .meal-col-name {
      font-weight: 700;
    }
    .meal-row td:not(.meal-col-index):not(.meal-col-name):not(.meal-col-total),
    .meal-variant td:not(.meal-col-index):not(.meal-col-name):not(.meal-col-total) {
      color: #5a5a5a;
      text-align: right;
    }
    .meal-col-total {
      font-weight: 700;
      font-size: 12pt;
      text-align: right;
      min-width: 48px;
    }
    .meal-variant .meal-col-name {
      padding-left: 18px;
      font-weight: 400;
    }
    .meal-group-end td {
      border-bottom: 1px solid #e4e4e4;
      padding-bottom: 14px;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

function escapeHtml(value: string) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function normalizePlatingPhase(phase: string) {
    const value = String(phase ?? '').trim();
    if (value === 'Batch1' || value.toUpperCase() === 'MP') {
        return 'MP';
    }
    return 'MP';
}

export function getPlatingPhaseLabel(phase: string) {
    return normalizePlatingPhase(phase);
}

export function buildSummaryCsvBase(
    kind: MealSummaryReportKind,
    date: string,
    phase: string,
) {
    const { title } = MEAL_SUMMARY_REPORT_CONFIG[kind];
    return [
        { first: 'Report', third: 'Delivery Date' },
        {
            first: `${title} (${phase})`,
            third: formatPlatingFileNameDate(date),
        },
    ];
}

export function buildPlatingCsvBase(date: string, phase: string) {
    return buildSummaryCsvBase('plating', date, phase);
}

export function buildPortioningCsvBase(date: string, phase: string) {
    return buildSummaryCsvBase('portioning', date, phase);
}

export function getMealSummaryReportMeta(
    kind: MealSummaryReportKind,
    phase: string,
) {
    const { title, successMessage } = MEAL_SUMMARY_REPORT_CONFIG[kind];
    return {
        title: `${title} (${phase})`,
        successMessage,
    };
}
export function getComponentsFromSelectedMeal(item: any, dumpRecipeData: any[]) {
    if (item?.variants?.components?.length) {
        return item.variants.components;
    }

    const recipeIndex = dumpRecipeData.findIndex(
        (dumpItem) => dumpItem?._id?.toString() === item?._id?.toString(),
    );

    if (recipeIndex !== -1) {
        return dumpRecipeData[recipeIndex]?.composition || [];
    }

    return [];
}

export function normalizeComponent(component: any, multiplyBy = 1) {
    return {
        name: component?.name || '',
        value: parseFloat(component?.net_qty || 0) * multiplyBy,
    };
}

export function addOrUpdateComponent(
    variants: any[],
    componentName: string,
    componentValue: number,
) {
    const index = variants.findIndex((variant) => variant.name === componentName);

    if (index === -1) {
        variants.push({
            name: componentName,
            value: componentValue,
        });
    } else {
        variants[index].value =
            Number(variants[index].value || 0) + Number(componentValue || 0);
    }
}

export function groupProductionSelectedMeals(
    list: any[],
    dumpRecipeData: any[] = [],
) {
    const result: any[] = [];
    let totalCount = 0;

    for (const item of list) {
        if (!item) continue;

        const id = item?._id?.toString();
        const index = result.findIndex((val) => val.id === id);
        const componentData = getComponentsFromSelectedMeal(item, dumpRecipeData);

        totalCount++;

        if (index === -1) {
            const variants = componentData.map((component) =>
                normalizeComponent(component),
            );

            result.push({
                id,
                name: item?.dish_name || '',
                count: 1,
                variants,
            });
        } else {
            result[index].count += 1;

            componentData.forEach((component) => {
                addOrUpdateComponent(
                    result[index].variants,
                    component?.name || '',
                    Number(component?.net_qty || 0),
                );
            });
        }
    }

    return {
        rows: result,
        totalCount,
    };
}

export function groupProductionNddItems(list: any[]) {
    const breakfastShow: any[] = [];
    const mealShow: any[] = [];
    const snacksShow: any[] = [];

    let breakfastCount = 0;
    let mealCount = 0;
    let snackCount = 0;

    for (const item of list) {
        const qty = parseInt(item?.qty || 0);
        const recipeId = item?.recipe_id?.toString();
        const components = item?.variants?.components || [];

        if (item?.meal_category === 'Breakfast') {
            const index = breakfastShow.findIndex((val) => val.id === recipeId);
            breakfastCount += qty;

            if (index === -1) {
                breakfastShow.push({
                    id: recipeId,
                    name: item?.dish_name || '',
                    count: qty,
                    variants: components.map((component) =>
                        normalizeComponent(component),
                    ),
                });
            } else {
                breakfastShow[index].count += qty;

                components.forEach((component) => {
                    addOrUpdateComponent(
                        breakfastShow[index].variants,
                        component?.name || '',
                        Number(component?.net_qty || 0) * qty,
                    );
                });
            }
        }

        if (item?.meal_category === 'Meal' || item?.meal_category === 'Add On') {
            const index = mealShow.findIndex((val) => val.id === recipeId);
            const name =
                item?.meal_category === 'Add On'
                    ? `${item?.dish_name} (Add On)`
                    : item?.dish_name;

            mealCount += qty;

            if (index === -1) {
                mealShow.push({
                    id: recipeId,
                    name,
                    count: qty,
                    variants: components.map((component) =>
                        normalizeComponent(component),
                    ),
                });
            } else {
                mealShow[index].count += qty;

                components.forEach((component) => {
                    addOrUpdateComponent(
                        mealShow[index].variants,
                        component?.name || '',
                        Number(component?.net_qty || 0) * qty,
                    );
                });
            }
        }

        if (item?.meal_category === 'Snack') {
            const index = snacksShow.findIndex((val) => val.id === recipeId);
            snackCount += qty;

            if (index === -1) {
                snacksShow.push({
                    id: recipeId,
                    name: item?.dish_name || '',
                    count: qty,
                    variants: components.map((component) =>
                        normalizeComponent(component),
                    ),
                });
            } else {
                snacksShow[index].count += qty;

                components.forEach((component) => {
                    addOrUpdateComponent(
                        snacksShow[index].variants,
                        component?.name || '',
                        Number(component?.net_qty || 0) * qty,
                    );
                });
            }
        }
    }

    return {
        breakfastShow,
        mealShow,
        snacksShow,
        breakfastCount,
        mealCount,
        snackCount,
    };
}

export function buildProductionCsvBase(date: string, phase: string) {
    return [
        { first: '', second: '', third: '' },
        { first: 'Report', second: '', third: 'Delivery Date' },
        {
            first: `Kitchen Production Report(${phase})`,
            second: '',
            third: formatKitchenDate(date),
        },
        { first: '', second: '', third: '' },
        { first: '', second: '', third: '' },
    ];
}

export function buildProductionCsvRows(
    baseRows: any[],
    breakfastShow: any[],
    breakfastCount: number,
    mealShow: any[],
    mealCount: number,
    snacksShow: any[],
    snackCount: number,
) {
    const csvPayload = [...baseRows];

    csvPayload.push({
        first: 'BreakFasts',
        second: '',
        third: breakfastCount,
    });
    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });

    breakfastShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });

        item?.variants?.forEach((variant) => {
            csvPayload.push({
                first: '',
                second: `-${variant.name}`,
                third: `${variant.value} grams`,
            });
        });

        csvPayload.push({
            first: '',
            second: '',
            third: '',
        });
    });

    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });
    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });

    csvPayload.push({
        first: 'Lunch/Dinner',
        second: '',
        third: mealCount,
    });
    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });

    mealShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });

        item?.variants?.forEach((variant) => {
            csvPayload.push({
                first: '',
                second: `-${variant.name}`,
                third: `${variant.value} grams`,
            });
        });

        csvPayload.push({
            first: '',
            second: '',
            third: '',
        });
    });

    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });
    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });

    csvPayload.push({
        first: 'Snacks',
        second: '',
        third: snackCount,
    });
    csvPayload.push({
        first: '',
        second: '',
        third: '',
    });

    snacksShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });

        item?.variants?.forEach((variant) => {
            csvPayload.push({
                first: '',
                second: `-${variant.name}`,
                third: `${variant.value} grams`,
            });
        });

        csvPayload.push({ first: '', second: '', third: '' });
    });

    csvPayload.push({ first: '', second: '', third: '' });
    csvPayload.push({ first: '', second: '', third: '' });

    return csvPayload;
}

export function groupPlatingBySelectedMeal(list: any[], includeVariants = false) {
    const result: any[] = [];
    let totalCount = 0;

    for (const item of list) {
        if (!item) continue;

        const id = item?._id?.toString();
        const index = result.findIndex((val) => val.id === id);

        if (index === -1) {
            const payload: any = {
                id,
                name: item?.dish_name || '',
                count: 1,
            };

            if (includeVariants) {
                payload.sizes = createEmptyPlatingSizes();
                addPlatingSizeCount(payload.sizes, getPlatingMealSizeKey(item), 1);
                payload.count = totalPlatingSizes(payload.sizes);
                payload.variants = [];
                addPlatingVariantSizes(
                    payload,
                    item?.variants?.protein_option || '',
                    item,
                    1,
                );
            }

            result.push(payload);
            totalCount += includeVariants ? payload.count : 1;
        } else {
            if (includeVariants) {
                addPlatingMealSizes(result[index], item, 1);
                addPlatingVariantSizes(
                    result[index],
                    item?.variants?.protein_option || '',
                    item,
                    1,
                );
                totalCount = result.reduce((sum, row) => sum + (row.count || 0), 0);
            } else {
                result[index].count += 1;
                totalCount += 1;
            }
        }
    }

    return { rows: result, totalCount };
}

export function groupPlatingNddItems(list: any[]) {
    const breakfastShow: any[] = [];
    const mealShow: any[] = [];
    const snacksShow: any[] = [];

    let breakfastCount = 0;
    let mealCount = 0;
    let snackCount = 0;

    for (const item of list) {
        const qty = parseInt(item?.qty || 0);
        const recipeId = item?.recipe_id?.toString();

        if (item?.meal_category === 'Breakfast') {
            const index = breakfastShow.findIndex((val) => val.id === recipeId);
            breakfastCount += qty;

            if (index === -1) {
                breakfastShow.push({
                    id: recipeId,
                    name: item?.dish_name || '',
                    count: qty,
                });
            } else {
                breakfastShow[index].count += qty;
            }
        }

        if (item?.meal_category === 'Meal' || item?.meal_category === 'Add On') {
            const index = mealShow.findIndex((val) => val.id === recipeId);
            const name =
                item?.meal_category === 'Add On'
                    ? `${item?.dish_name} (Add On)`
                    : item?.dish_name;

            if (index === -1) {
                const mealRow: any = {
                    id: recipeId,
                    name,
                    count: 0,
                    sizes: createEmptyPlatingSizes(),
                    variants: [],
                };
                addPlatingMealSizes(mealRow, item, qty);
                addPlatingVariantSizes(
                    mealRow,
                    item?.variants?.protein_option || '',
                    item,
                    qty,
                );
                mealShow.push(mealRow);
            } else {
                addPlatingMealSizes(mealShow[index], item, qty);
                addPlatingVariantSizes(
                    mealShow[index],
                    item?.variants?.protein_option || '',
                    item,
                    qty,
                );
            }
        }

        if (item?.meal_category === 'Snack') {
            const index = snacksShow.findIndex((val) => val.id === recipeId);
            snackCount += qty;

            if (index === -1) {
                snacksShow.push({
                    id: recipeId,
                    name: item?.dish_name || '',
                    count: qty,
                });
            } else {
                snacksShow[index].count += qty;
            }
        }
    }

    mealCount = mealShow.reduce(
        (sum, row) => sum + totalPlatingSizes(row.sizes ?? createEmptyPlatingSizes()),
        0,
    );

    return {
        breakfastShow,
        mealShow,
        snacksShow,
        breakfastCount,
        mealCount,
        snackCount,
    };
}

function platingMealSizeRow(
    first: any,
    second: any,
    sizes?: PlatingSizeCounts,
): PlatingReportRow {
    const s = sizes ?? createEmptyPlatingSizes();
    const total = totalPlatingSizes(s);

    return {
        first,
        second,
        third: s.extra_small,
        fourth: s.small,
        fifth: s.medium,
        sixth: s.large,
        seventh: s.extra_large,
        eighth: total,
    };
}

export function buildPlatingCsvRows(
    baseRows: PlatingReportRow[],
    breakfastShow: any[],
    breakfastCount: number,
    mealShow: any[],
    mealCount: number,
    snacksShow: any[],
    snackCount: number,
) {
    const csvPayload: PlatingReportRow[] = [...baseRows];

    pushPlatingEmptyRows(csvPayload, 1);

    csvPayload.push({ first: 'BreakFasts', third: breakfastCount });
    pushPlatingEmptyRows(csvPayload, 1);
    csvPayload.push({ third: 'Quantity' });

    breakfastShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });
    });

    pushPlatingEmptyRows(csvPayload, 2);

    csvPayload.push({ first: 'Snacks', third: snackCount });
    csvPayload.push({ third: 'Quantity' });

    snacksShow.forEach((item, index) => {
        csvPayload.push({
            first: index + 1,
            second: item.name,
            third: item.count,
        });
    });

    pushPlatingEmptyRows(csvPayload, 2);

    csvPayload.push({ first: 'Lunch/Dinner', third: mealCount });
    pushPlatingEmptyRows(csvPayload, 1);
    csvPayload.push({
        third: 'Extra Small',
        fourth: 'Small',
        fifth: 'Medium',
        sixth: 'Large',
        seventh: 'Extra Large',
        eighth: 'Total',
    });
    pushPlatingEmptyRows(csvPayload, 1);

    mealShow.forEach((item, index) => {
        csvPayload.push(platingMealSizeRow(index + 1, item.name, item.sizes));

        item?.variants?.forEach((variant) => {
            csvPayload.push(
                platingMealSizeRow('', `-${variant.name}`, variant.sizes),
            );
        });
    });

    return csvPayload;
}