import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { CanonicalNutritionResolution } from "@/lib/canonical-nutrition";
import type { CalculatedFoodNutrition } from "@/lib/nutrition";

export const FINAL_NUTRITION_SNAPSHOT_CONTRACT = "logged_quantity_v1";

type MealNutritionRow = Pick<Tables<"meal_entries">, "ai_raw" | "serving_qty">;

export function mealNutritionMultiplier(meal: MealNutritionRow): number {
  // Legacy rows keep their established per-serving semantics. New canonical
  // snapshots carry final logged-quantity values and must never scale twice.
  return hasFinalNutritionSnapshot(meal) ? 1 : Number(meal.serving_qty ?? 1);
}

export function hasFinalNutritionSnapshot(meal: Pick<Tables<"meal_entries">, "ai_raw">): boolean {
  return (
    isJsonObject(meal.ai_raw) &&
    meal.ai_raw.nutrition_contract === FINAL_NUTRITION_SNAPSHOT_CONTRACT
  );
}

export function applyCanonicalNutritionSnapshot(
  meal: TablesInsert<"meal_entries">,
  resolution: CanonicalNutritionResolution,
): TablesInsert<"meal_entries"> {
  if (!resolution.ok) return meal;

  return {
    ...meal,
    calories_kcal: resolution.nutrition.calories_kcal,
    protein_g: resolution.nutrition.protein_g,
    carbs_g: resolution.nutrition.carbs_g,
    fat_g: resolution.nutrition.fat_g,
    fiber_g: resolution.nutrition.fiber_g,
    sugar_g: resolution.nutrition.sugar_g,
    sodium_mg: resolution.nutrition.sodium_mg,
    ai_raw: {
      ...asJsonObject(meal.ai_raw),
      nutrition_contract: FINAL_NUTRITION_SNAPSHOT_CONTRACT,
      canonical_food_id: resolution.foodId,
      canonical_grams: resolution.grams,
    },
  };
}

export function applyRecipeNutritionSnapshot(
  meal: TablesInsert<"meal_entries">,
  recipeId: string,
  nutrition: CalculatedFoodNutrition,
): TablesInsert<"meal_entries"> {
  return {
    ...meal,
    calories_kcal: nutrition.calories_kcal,
    protein_g: nutrition.protein_g,
    carbs_g: nutrition.carbs_g,
    fat_g: nutrition.fat_g,
    fiber_g: nutrition.fiber_g,
    sugar_g: nutrition.sugar_g,
    sodium_mg: nutrition.sodium_mg,
    ai_raw: {
      ...asJsonObject(meal.ai_raw),
      nutrition_contract: FINAL_NUTRITION_SNAPSHOT_CONTRACT,
      recipe_id: recipeId,
    },
  };
}

function isJsonObject(
  value: Json | null | undefined,
): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asJsonObject(value: Json | null | undefined): { [key: string]: Json | undefined } {
  return isJsonObject(value) ? value : {};
}
