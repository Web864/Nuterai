import type { Tables } from "@/integrations/supabase/types";
import {
  calculateNutritionFromGrams,
  type CalculatedFoodNutrition,
  type CanonicalFoodReference,
  type FoodNutritionFacts,
  type NutritionCalculationErrorCode,
} from "@/lib/nutrition";

export type RecipeIngredientNutritionInput = {
  ingredientId: string;
  food: CanonicalFoodReference | null | undefined;
  facts: FoodNutritionFacts | null | undefined;
  grams: number;
};

export type RecipeNutritionResult =
  | {
      ok: true;
      total: CalculatedFoodNutrition;
      perServing: CalculatedFoodNutrition;
      loggedQuantity: CalculatedFoodNutrition;
    }
  | {
      ok: false;
      code: "invalid_recipe_servings" | NutritionCalculationErrorCode;
      ingredientId?: string;
    };

export function calculateRecipeNutrition(
  ingredients: RecipeIngredientNutritionInput[],
  recipeServings: number,
  loggedServings = 1,
): RecipeNutritionResult {
  if (!isPositiveFinite(recipeServings) || !isPositiveFinite(loggedServings)) {
    return { ok: false, code: "invalid_recipe_servings" };
  }

  let total: CalculatedFoodNutrition = {
    calories_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sugar_g: 0,
    sodium_mg: 0,
  };

  for (const ingredient of ingredients) {
    const calculation = calculateNutritionFromGrams(
      ingredient.food,
      ingredient.facts,
      ingredient.grams,
    );
    if (!calculation.ok) {
      return { ok: false, code: calculation.code, ingredientId: ingredient.ingredientId };
    }
    total = addNutrition(total, calculation.nutrition);
  }

  const perServing = scaleNutrition(total, 1 / recipeServings);
  return {
    ok: true,
    total,
    perServing,
    loggedQuantity: scaleNutrition(perServing, loggedServings),
  };
}

function addNutrition(
  left: CalculatedFoodNutrition,
  right: CalculatedFoodNutrition,
): CalculatedFoodNutrition {
  return {
    calories_kcal: left.calories_kcal + right.calories_kcal,
    protein_g: left.protein_g + right.protein_g,
    carbs_g: left.carbs_g + right.carbs_g,
    fat_g: left.fat_g + right.fat_g,
    fiber_g: left.fiber_g + right.fiber_g,
    sugar_g: addOptionalNutrient(left.sugar_g, right.sugar_g),
    sodium_mg: addOptionalNutrient(left.sodium_mg, right.sodium_mg),
  };
}

function scaleNutrition(
  nutrition: CalculatedFoodNutrition,
  multiplier: number,
): CalculatedFoodNutrition {
  return {
    calories_kcal: nutrition.calories_kcal * multiplier,
    protein_g: nutrition.protein_g * multiplier,
    carbs_g: nutrition.carbs_g * multiplier,
    fat_g: nutrition.fat_g * multiplier,
    fiber_g: nutrition.fiber_g * multiplier,
    sugar_g: nutrition.sugar_g === null ? null : nutrition.sugar_g * multiplier,
    sodium_mg: nutrition.sodium_mg === null ? null : nutrition.sodium_mg * multiplier,
  };
}

function addOptionalNutrient(left: number | null, right: number | null): number | null {
  return left === null || right === null ? null : left + right;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export type RecipeIngredientRow = Pick<Tables<"recipe_ingredients">, "id" | "food_id" | "grams">;
