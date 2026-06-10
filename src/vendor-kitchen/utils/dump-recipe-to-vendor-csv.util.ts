/**
 * Converts Delicut dump_recipes menu rows → be-meal-vendors bulk-upload CSV.
 * @see be-meal-vendors recipe-bulk-upload.service.ts CSV_HEADERS
 */

export const VENDOR_RECIPE_CSV_HEADERS = [
  'dish_name',
  'meal_category',
  'dish_type',
  'cuisine',
  'description',
  'ingredients',
  'allergens_contain',
  'package_instruction',
  'package_is_separate',
  'internal_photos',
  'variant',
  'variant_ingredients',
  'size',
  'kcal',
  'protein',
  'carb',
  'fat',
  'price',
] as const;

export type VendorRecipeCsvHeader = (typeof VENDOR_RECIPE_CSV_HEADERS)[number];

export type VendorRecipeCsvRow = Record<VendorRecipeCsvHeader, string>;

/**
 * Delicut dump values are written to CSV as-is (no static master-data remapping).
 * be-meal-vendors bulk-upload resolves names against vendor MasterData and returns
 * `errors` / `missing_master_data` for unknown labels.
 */

function str(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

/** CSV `variant` column: dump `protein_option` (e.g. Chicken), then `protein_type` from price rows. */
function resolveVariantLabel(variant: Record<string, unknown>): string {
  return str(variant.protein_option) || str(variant.protein_type);
}

function hasVariantLabel(value: unknown): boolean {
  return Boolean(str(value));
}

/** image / internal_image may be string, array, or missing in dump data */
function asImageList(value: unknown): unknown[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function csvEscape(value: string): string {
  const v = value ?? '';
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function rowToCsvLine(row: VendorRecipeCsvRow): string {
  return VENDOR_RECIPE_CSV_HEADERS.map((h) => csvEscape(row[h] ?? '')).join(',');
}

/** Recipe-level ingredients (aggregation outputs string[] for balance/low rows). */
function extractIngredients(recipe: Record<string, unknown>, proteinCategory?: string): string {
  const raw = recipe.ingredients;
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
    return raw.map((x) => str(x)).filter(Boolean).join(', ');
  }

  const blocks = Array.isArray(raw) ? raw : [];
  const names = new Set<string>();

  const addFromBlock = (block: Record<string, unknown>) => {
    const list = Array.isArray(block.ingredients) ? block.ingredients : [];
    for (const ing of list) {
      const name = str(ing);
      if (name) names.add(name);
    }
  };

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const b = block as Record<string, unknown>;
    if (proteinCategory && str(b.protein_category) && str(b.protein_category) !== proteinCategory) {
      continue;
    }
    addFromBlock(b);
  }

  if (names.size === 0) {
    for (const block of blocks) {
      if (block && typeof block === 'object') addFromBlock(block as Record<string, unknown>);
    }
  }

  return [...names].join(', ');
}

function extractVariantIngredients(variant: Record<string, unknown>): string {
  const list = Array.isArray(variant.variant_ingredients) ? variant.variant_ingredients : [];
  return list.map((x) => str(x)).filter(Boolean).join(', ');
}

function extractAllergens(recipe: Record<string, unknown>): string {
  const list = Array.isArray(recipe.allergens)
    ? recipe.allergens
    : Array.isArray(recipe.allergens_contain)
      ? recipe.allergens_contain
      : [];
  return list.map((a) => str(a)).filter(Boolean).join(', ');
}

function extractDishTypes(recipe: Record<string, unknown>): string {
  const list = Array.isArray(recipe.dish_type) ? recipe.dish_type : [];
  return list.map((d) => str(d)).filter(Boolean).join(', ');
}

function resolvePackage(
  recipe: Record<string, unknown>,
  variant?: Record<string, unknown>
): { instruction: string; is_separate: boolean } {
  const variantPkgs = Array.isArray(variant?.packaging_material)
    ? variant.packaging_material
    : [];
  const mainVariantPkg = variantPkgs.find(
    (p: Record<string, unknown>) => p?.is_main === true
  ) as Record<string, unknown> | undefined;
  if (mainVariantPkg) {
    return {
      instruction: str(mainVariantPkg.instruction) || str(mainVariantPkg.material),
      is_separate: Boolean(mainVariantPkg.is_separate),
    };
  }

  const originals = Array.isArray(recipe.packaging_material_original)
    ? recipe.packaging_material_original
    : [];
  const mainOrig = originals.find((p: Record<string, unknown>) => p?.is_main === true) as
    | Record<string, unknown>
    | undefined;
  if (mainOrig) {
    return {
      instruction: str(mainOrig.instruction) || str(mainOrig.material),
      is_separate: false,
    };
  }

  return {
    instruction: str(recipe.label_instruction),
    is_separate: false,
  };
}

function resolveInternalPhotos(
  recipe: Record<string, unknown>,
  imageBaseUrl: string
): string {
  const urls: string[] = [];
  const base = imageBaseUrl.replace(/\/$/, '');

  const infoList = Array.isArray(recipe.protein_category_info)
    ? recipe.protein_category_info
    : [];
  for (const info of infoList) {
    if (!info || typeof info !== 'object') continue;
    const infoObj = info as Record<string, unknown>;
    const images = [...asImageList(infoObj.image), ...asImageList(infoObj.internal_image)];
    for (const img of images) {
      const path = str(img);
      if (!path) continue;
      urls.push(path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`);
    }
  }

  const website = Array.isArray(recipe.website_image) ? recipe.website_image : [];
  for (const img of website) {
    let path = '';
    if (img && typeof img === 'object' && 'image' in (img as object)) {
      path = str((img as Record<string, unknown>).image);
    } else {
      path = str(img);
    }
    if (path) urls.push(path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`);
  }

  return [...new Set(urls)].join(', ');
}

function findPriceForVariant(
  recipe: Record<string, unknown>,
  variant: Record<string, unknown>
): number {
  if (variant.price != null && variant.price !== '') {
    return num(variant.price);
  }

  const size = str(variant.size) || 'standard';
  const proteinCategory = str(variant.protein_category);
  const proteinOption = resolveVariantLabel(variant);

  const prices = Array.isArray(recipe.price) ? recipe.price : [];
  const match =
    prices.find(
      (p: Record<string, unknown>) =>
        str(p.protein_category) === proteinCategory &&
        (str(p.protein_type) === proteinOption || str(p.protein_type) === 'Standard')
    ) ??
    prices.find((p: Record<string, unknown>) => str(p.protein_category) === proteinCategory);

  if (match && typeof match === 'object') {
    const sizePrices = (match as Record<string, unknown>).size_prices as
      | Record<string, unknown>
      | undefined;
    if (sizePrices && sizePrices[size] != null) {
      return num(sizePrices[size]);
    }
    return num((match as Record<string, unknown>).average_price);
  }

  return 0;
}

function buildVariantRow(
  recipe: Record<string, unknown>,
  variant: Record<string, unknown>,
  recipeLevel: VendorRecipeCsvRow,
  imageBaseUrl: string
): VendorRecipeCsvRow {
  const pkg = resolvePackage(recipe, variant);
  const priceVal = findPriceForVariant(recipe, variant);
  const variantIngredients = extractVariantIngredients(variant);

  return {
    ...recipeLevel,
    variant: resolveVariantLabel(variant),
    variant_ingredients: variantIngredients,
    size: str(variant.size) || 'standard',
    kcal: String(Math.round(num(variant.kcal))),
    protein: String(Math.round(num(variant.protein))),
    carb: String(Math.round(num(variant.carb))),
    fat: String(Math.round(num(variant.fat))),
    price: String(priceVal > 0 ? priceVal : findPriceForVariant(recipe, variant)),
    package_instruction: recipeLevel.package_instruction || pkg.instruction,
    package_is_separate: recipeLevel.package_is_separate || String(pkg.is_separate),
  };
}

function buildRecipeLevelFields(
  recipe: Record<string, unknown>,
  imageBaseUrl: string
): VendorRecipeCsvRow {
  const variants = Array.isArray(recipe.variants) ? recipe.variants : [];
  const firstVariant =
    variants.length > 0 && variants[0] && typeof variants[0] === 'object'
      ? (variants[0] as Record<string, unknown>)
      : undefined;
  const pkg = resolvePackage(recipe, firstVariant);

  return {
    dish_name: str(recipe.dish_name),
    meal_category: str(recipe.meal_category),
    dish_type: extractDishTypes(recipe),
    cuisine: str(recipe.cuisine),
    description: str(recipe.description),
    ingredients: extractIngredients(recipe),
    allergens_contain: extractAllergens(recipe),
    package_instruction: pkg.instruction,
    package_is_separate: String(pkg.is_separate),
    internal_photos: resolveInternalPhotos(recipe, imageBaseUrl),
    variant: '',
    variant_ingredients: '',
    size: '',
    kcal: '',
    protein: '',
    carb: '',
    fat: '',
    price: '',
  };
}

function buildRowsFromPriceFallback(
  recipe: Record<string, unknown>,
  recipeLevel: VendorRecipeCsvRow
): VendorRecipeCsvRow[] {
  const rows: VendorRecipeCsvRow[] = [];
  const prices = Array.isArray(recipe.price) ? recipe.price : [];

  for (const p of prices) {
    if (!p || typeof p !== 'object') continue;
    const priceEntry = p as Record<string, unknown>;
    const sizePrices = priceEntry.size_prices as Record<string, unknown> | undefined;
    if (!sizePrices) continue;

    const variantName = str(priceEntry.protein_type);
    if (!variantName) continue;

    const proteinCategory = str(priceEntry.protein_category);

    for (const [size, priceVal] of Object.entries(sizePrices)) {
      const ingredients = extractIngredients(recipe, proteinCategory) || recipeLevel.ingredients;
      rows.push({
        ...recipeLevel,
        ingredients,
        variant: variantName,
        variant_ingredients: ingredients,
        size,
        kcal: '',
        protein: '',
        carb: '',
        fat: '',
        price: String(num(priceVal)),
      });
    }
  }

  return rows;
}

/** One dump recipe → 1..n CSV rows (variant lines). */
export function dumpRecipeToVendorCsvRows(
  recipe: Record<string, unknown>,
  imageBaseUrl = ''
): VendorRecipeCsvRow[] {
  const recipeLevel = buildRecipeLevelFields(recipe, imageBaseUrl);
  const variants = Array.isArray(recipe.variants) ? recipe.variants : [];

  if (variants.length > 0) {
    const rows: VendorRecipeCsvRow[] = [];
    let firstIncluded = true;
    variants.forEach((v) => {
      if (!v || typeof v !== 'object') return;
      const variant = v as Record<string, unknown>;
      if (!hasVariantLabel(resolveVariantLabel(variant))) return;

      const proteinCategory = str(variant.protein_category);
      const levelForRow: VendorRecipeCsvRow = firstIncluded
        ? {
            ...recipeLevel,
            ingredients: extractIngredients(recipe, proteinCategory) || recipeLevel.ingredients,
          }
        : { ...emptyRecipeLevelContinuation(), dish_name: recipeLevel.dish_name };
      firstIncluded = false;
      rows.push(buildVariantRow(recipe, variant, levelForRow, imageBaseUrl));
    });
    if (rows.length > 0) return rows;
  }

  const fallback = buildRowsFromPriceFallback(recipe, recipeLevel);
  if (fallback.length > 0) return fallback;

  return [];
}

function emptyRecipeLevelContinuation(): VendorRecipeCsvRow {
  return {
    dish_name: '',
    meal_category: '',
    dish_type: '',
    cuisine: '',
    description: '',
    ingredients: '',
    allergens_contain: '',
    package_instruction: '',
    package_is_separate: '',
    internal_photos: '',
    variant: '',
    variant_ingredients: '',
    size: '',
    kcal: '',
    protein: '',
    carb: '',
    fat: '',
    price: '',
  };
}

export interface DumpToVendorCsvResult {
  csv: string;
  row_count: number;
  dish_count: number;
  headers: readonly string[];
  rows: VendorRecipeCsvRow[];
}

/**
 * Convert dump_recipes[].recipes arrays into vendor bulk-upload CSV.
 * Deduplicates variant lines by dish_name + variant + size (last wins).
 */
export function dumpRecipesToVendorCsv(
  recipes: Record<string, unknown>[],
  imageBaseUrl = ''
): DumpToVendorCsvResult {
  const lineKey = (row: VendorRecipeCsvRow) =>
    `${row.dish_name}\u0000${row.variant}\u0000${row.size}`;

  const byKey = new Map<string, VendorRecipeCsvRow>();

  for (const recipe of recipes) {
    if (!recipe || typeof recipe !== 'object') continue;
    const rows = dumpRecipeToVendorCsvRows(recipe, imageBaseUrl);
    for (const row of rows) {
      if (!row.dish_name || !hasVariantLabel(row.variant)) continue;
      const key = lineKey(row);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
        continue;
      }
      // Merge continuation-style: keep recipe-level from first, update variant metrics
      byKey.set(key, {
        ...existing,
        ...row,
        dish_name: existing.dish_name || row.dish_name,
        meal_category: existing.meal_category || row.meal_category,
        dish_type: existing.dish_type || row.dish_type,
        cuisine: existing.cuisine || row.cuisine,
        description: existing.description || row.description,
        ingredients: existing.ingredients || row.ingredients,
        allergens_contain: existing.allergens_contain || row.allergens_contain,
        package_instruction: existing.package_instruction || row.package_instruction,
        package_is_separate: existing.package_is_separate || row.package_is_separate,
        internal_photos: existing.internal_photos || row.internal_photos,
      });
    }
  }

  const rows = [...byKey.values()];
  const dishNames = new Set(rows.map((r) => r.dish_name));

  const csvLines = [VENDOR_RECIPE_CSV_HEADERS.join(','), ...rows.map(rowToCsvLine)];

  return {
    csv: csvLines.join('\n') + '\n',
    row_count: rows.length,
    dish_count: dishNames.size,
    headers: VENDOR_RECIPE_CSV_HEADERS,
    rows,
  };
}
