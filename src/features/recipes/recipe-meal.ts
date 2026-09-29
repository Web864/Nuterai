import type { TablesInsert } from "@/integrations/supabase/types";
import { applyRecipeNutritionSnapshot } from "@/features/logging/nutrition-contract";
import {
  calculateRecipeNutrition,
  type RecipeIngredientNutritionInput,
  type RecipeNutritionResult,
} from "@/lib/recipe-nutrition";

export type RecipeMealSnapshotInput = {
  userId: string;
  recipeId: string;
  recipeName: string;
  mealType: TablesInsert<"meal_entries">["meal_type"];
  recipeServings: number;
  loggedServings: number;
  ingredients: RecipeIngredientNutritionInput[];
};

export type RecipeMealSnapshotResult =
  | {
      ok: true;
      meal: TablesInsert<"meal_entries">;
      nutrition: RecipeNutritionResult & { ok: true };
    }
  | { ok: false; nutrition: Exclude<RecipeNutritionResult, { ok: true }> };

export function buildRecipeMealSnapshot(input: RecipeMealSnapshotInput): RecipeMealSnapshotResult {
  const nutrition = calculateRecipeNutrition(
    input.ingredients,
    input.recipeServings,
    input.loggedServings,
  );
  if (!nutrition.ok) return { ok: false, nutrition };

  return {
    ok: true,
    nutrition,
    meal: applyRecipeNutritionSnapshot(
      {
        user_id: input.userId,
        name: input.recipeName,
        meal_type: input.mealType,
        serving_qty: input.loggedServings,
        serving_unit: "serving",
        source: "recipe",
      },
      input.recipeId,
      nutrition.loggedQuantity,
    ),
  };
}
