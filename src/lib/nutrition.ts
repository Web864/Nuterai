import type { Tables } from "@/integrations/supabase/types";

/**
 * Nutrition math: BMR (Mifflin-St Jeor), TDEE, calorie targets, macros, water.
 * Pure functions — safe to import from client or server.
 */

export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal =
  "lose_weight" | "maintain" | "gain_weight" | "build_muscle" | "improve_health" | "boost_energy";

const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateAge(birthDateISO?: string | null): number | null {
  if (!birthDateISO) return null;
  const d = new Date(birthDateISO);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function bmrMifflinStJeor(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const { weightKg, heightCm, age, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // "other" / "prefer_not_to_say" -> average of male/female offsets
  if (sex === "male") return Math.round(base + 5);
  if (sex === "female") return Math.round(base - 161);
  return Math.round(base - 78);
}

export function tdee(bmr: number, activity: Activity): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIER[activity]);
}

export function calorieTargetForGoal(tdeeKcal: number, goal: Goal, paceKgPerWeek = 0.5): number {
  // 1 kg ≈ 7700 kcal → per-day deficit/surplus
  const dailyDelta = Math.round((paceKgPerWeek * 7700) / 7);
  switch (goal) {
    case "lose_weight":
      return Math.max(1200, tdeeKcal - dailyDelta);
    case "gain_weight":
    case "build_muscle":
      return tdeeKcal + Math.max(200, Math.round(dailyDelta * 0.7));
    default:
      return tdeeKcal;
  }
}

export function macroSplit(calories: number, goal: Goal, weightKg: number) {
  // Protein target: 1.6–2.2 g/kg based on goal
  const proteinPerKg = goal === "build_muscle" ? 2.2 : goal === "lose_weight" ? 2.0 : 1.6;
  const proteinG = Math.round(proteinPerKg * weightKg);
  const proteinKcal = proteinG * 4;

  // Fat: 25% of calories
  const fatKcal = Math.round(calories * 0.25);
  const fatG = Math.round(fatKcal / 9);

  // Carbs: the rest
  const carbsKcal = Math.max(0, calories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  const fiberG = Math.max(25, Math.round(calories / 1000) * 14);

  return { proteinG, carbsG, fatG, fiberG };
}

export function waterTargetMl(weightKg: number, activity: Activity): number {
  // 35 ml/kg baseline + 350 ml per activity tier above sedentary
  const tierBonus =
    { sedentary: 0, light: 350, moderate: 500, active: 700, very_active: 900 }[activity] ?? 0;
  return Math.round(35 * weightKg + tierBonus);
}

export interface CalculatedTargets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
}

export function calculateTargets(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: Activity;
  goal: Goal;
  paceKgPerWeek?: number;
}): CalculatedTargets {
  const bmr = bmrMifflinStJeor(input);
  const t = tdee(bmr, input.activity);
  const calories = calorieTargetForGoal(t, input.goal, input.paceKgPerWeek);
  const macros = macroSplit(calories, input.goal, input.weightKg);
  const waterMl = waterTargetMl(input.weightKg, input.activity);
  return { bmr, tdee: t, calories, ...macros, waterMl };
}

export type CanonicalFoodReference = Pick<Tables<"foods">, "id">;
export type FoodNutritionFacts = Pick<
  Tables<"food_nutrition_facts">,
  | "food_id"
  | "calories_per_100g"
  | "protein_per_100g"
  | "carbs_per_100g"
  | "fat_per_100g"
  | "fiber_per_100g"
  | "sugar_per_100g"
  | "sodium_mg_per_100g"
>;
export type FoodServingDefinition = Pick<
  Tables<"food_servings">,
  "food_id" | "name" | "unit" | "grams"
>;

export type CalculatedFoodNutrition = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number | null;
  sodium_mg: number | null;
};

export type NutritionCalculationErrorCode =
  | "missing_food"
  | "missing_nutrition_facts"
  | "nutrition_facts_food_mismatch"
  | "invalid_nutrition_facts"
  | "missing_serving_conversion"
  | "serving_food_mismatch"
  | "invalid_serving_conversion"
  | "invalid_quantity";

export type NutritionCalculationResult =
  | {
      ok: true;
      foodId: string;
      grams: number;
      nutrition: CalculatedFoodNutrition;
    }
  | {
      ok: false;
      code: NutritionCalculationErrorCode;
    };

function unresolved(code: NutritionCalculationErrorCode): NutritionCalculationResult {
  return { ok: false, code };
}

function isNonNegativeFinite(value: number | null): boolean {
  return value !== null && Number.isFinite(value) && value >= 0;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function hasValidNutritionFacts(facts: FoodNutritionFacts): boolean {
  return (
    isNonNegativeFinite(facts.calories_per_100g) &&
    isNonNegativeFinite(facts.protein_per_100g) &&
    isNonNegativeFinite(facts.carbs_per_100g) &&
    isNonNegativeFinite(facts.fat_per_100g) &&
    isNonNegativeFinite(facts.fiber_per_100g) &&
    (facts.sugar_per_100g === null || isNonNegativeFinite(facts.sugar_per_100g)) &&
    (facts.sodium_mg_per_100g === null || isNonNegativeFinite(facts.sodium_mg_per_100g))
  );
}

/**
 * Calculates nutrition from a canonical food's per-100g facts. This is pure
 * math: callers must resolve food and nutrition records before invoking it.
 */
export function calculateNutritionFromGrams(
  food: CanonicalFoodReference | null | undefined,
  facts: FoodNutritionFacts | null | undefined,
  grams: number,
): NutritionCalculationResult {
  if (!food) return unresolved("missing_food");
  if (!facts) return unresolved("missing_nutrition_facts");
  if (facts.food_id !== food.id) return unresolved("nutrition_facts_food_mismatch");
  if (!hasValidNutritionFacts(facts)) return unresolved("invalid_nutrition_facts");
  if (!isPositiveFinite(grams)) return unresolved("invalid_quantity");

  const scale = grams / 100;
  return {
    ok: true,
    foodId: food.id,
    grams,
    nutrition: {
      calories_kcal: facts.calories_per_100g * scale,
      protein_g: facts.protein_per_100g * scale,
      carbs_g: facts.carbs_per_100g * scale,
      fat_g: facts.fat_per_100g * scale,
      fiber_g: facts.fiber_per_100g * scale,
      sugar_g: facts.sugar_per_100g === null ? null : facts.sugar_per_100g * scale,
      sodium_mg: facts.sodium_mg_per_100g === null ? null : facts.sodium_mg_per_100g * scale,
    },
  };
}

/**
 * Converts a database-defined serving to grams, then delegates to the same
 * per-100g calculation. No UI or AI conversion values are accepted here.
 */
export function calculateNutritionFromServing(
  food: CanonicalFoodReference | null | undefined,
  facts: FoodNutritionFacts | null | undefined,
  serving: FoodServingDefinition | null | undefined,
  quantity: number,
): NutritionCalculationResult {
  if (!isPositiveFinite(quantity)) return unresolved("invalid_quantity");
  if (!serving) return unresolved("missing_serving_conversion");
  if (!isPositiveFinite(serving.grams) || !serving.name.trim() || !serving.unit.trim()) {
    return unresolved("invalid_serving_conversion");
  }
  if (!food) return unresolved("missing_food");
  if (serving.food_id !== food.id) return unresolved("serving_food_mismatch");

  const grams = serving.grams * quantity;
  if (!isPositiveFinite(grams)) return unresolved("invalid_quantity");
  return calculateNutritionFromGrams(food, facts, grams);
}
