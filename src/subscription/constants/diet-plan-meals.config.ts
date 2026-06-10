/**
 * Mandatory meal slots per diet plan (protein_category).
 * Customers may add extra meals (e.g. breakfast) but cannot remove these.
 * Extend this map when new diet plans are introduced.
 */
export const DIET_PLAN_MANDATORY_MEALS: Record<string, readonly string[]> = {
  pcos: ['lunch', 'dinner', 'morning_snack'],
  diabetes: ['lunch', 'dinner'],
};

/** Stable display / persistence order for meal slots */
export const MEAL_SLOT_ORDER = [
  'breakfast',
  'morning_snack',
  'lunch',
  'evening_snack',
  'dinner',
] as const;

export type MealSlot = (typeof MEAL_SLOT_ORDER)[number];

export function normalizeDietPlanKey(
  proteinCategory?: string | null,
): string | null {
  if (!proteinCategory || typeof proteinCategory !== 'string') {
    return null;
  }
  return proteinCategory.trim().toLowerCase();
}

export function getMandatoryMealsForDietPlan(
  proteinCategory?: string | null,
): string[] {
  const key = normalizeDietPlanKey(proteinCategory);
  if (!key || !DIET_PLAN_MANDATORY_MEALS[key]) {
    return [];
  }
  return [...DIET_PLAN_MANDATORY_MEALS[key]];
}

export function sortMealSlots(meals: string[]): string[] {
  const orderIndex = new Map(MEAL_SLOT_ORDER.map((m, i) => [m, i]));
  return [...new Set(meals)].sort(
    (a, b) =>
      (orderIndex.get(a as MealSlot) ?? 99) - (orderIndex.get(b as MealSlot) ?? 99),
  );
}

/** Union of current selection with plan-required meals (no removals). */
export function mergeSelectedMealsWithMandatory(
  selectedMeals: string[] | undefined,
  proteinCategory?: string | null,
): string[] {
  const mandatory = getMandatoryMealsForDietPlan(proteinCategory);
  if (mandatory.length === 0) {
    return sortMealSlots(selectedMeals ?? []);
  }
  return sortMealSlots([...(selectedMeals ?? []), ...mandatory]);
}

export function getMissingMandatoryMeals(
  selectedMeals: string[] | undefined,
  proteinCategory?: string | null,
): string[] {
  const mandatory = getMandatoryMealsForDietPlan(proteinCategory);
  if (mandatory.length === 0) {
    return [];
  }
  const selected = new Set((selectedMeals ?? []).map((m) => m.toLowerCase()));
  return mandatory.filter((m) => !selected.has(m.toLowerCase()));
}

export function formatMandatoryMealsMessage(missing: string[]): string {
  return `This diet plan requires the following meals and they cannot be removed: ${missing.join(', ')}`;
}
