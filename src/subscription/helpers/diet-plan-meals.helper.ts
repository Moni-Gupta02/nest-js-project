import { BadRequestException } from '@nestjs/common';
import {
  DIET_PLAN_MANDATORY_MEALS,
  formatMandatoryMealsMessage,
  getMandatoryMealsForDietPlan,
  getMissingMandatoryMeals,
} from '../constants/diet-plan-meals.config';

export function assertMandatoryMealsPresent(
  selectedMeals: string[] | undefined,
  proteinCategory?: string | null,
): void {
  const missing = getMissingMandatoryMeals(selectedMeals, proteinCategory);
  if (missing.length > 0) {
    throw new BadRequestException(formatMandatoryMealsMessage(missing));
  }
}

export function getDietPlanMealsConfigForApi(proteinCategory?: string | null): {
  protein_category: string | null;
  mandatory_meals: string[];
  allows_extra_meals: boolean;
  all_diet_plans: Record<string, string[]>;
} {
  const key =
    proteinCategory?.trim().toLowerCase() ?? null;
  return {
    protein_category: key,
    mandatory_meals: getMandatoryMealsForDietPlan(proteinCategory),
    allows_extra_meals: true,
    all_diet_plans: Object.fromEntries(
      Object.entries(DIET_PLAN_MANDATORY_MEALS).map(([plan, meals]) => [
        plan,
        [...meals],
      ]),
    ),
  };
}
