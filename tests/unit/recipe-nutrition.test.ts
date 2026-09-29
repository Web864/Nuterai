import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRecipeMealSnapshot } from "@/features/recipes/recipe-meal";
import { mealNutritionMultiplier } from "@/features/logging/nutrition-contract";
import { resolveCanonicalNutrition } from "@/lib/canonical-nutrition";
import {
  calculateRecipeNutrition,
  type RecipeIngredientNutritionInput,
} from "@/lib/recipe-nutrition";

const chicken: RecipeIngredientNutritionInput = {
  ingredientId: "chicken",
  food: { id: "food-chicken" },
  facts: {
    food_id: "food-chicken",
    calories_per_100g: 200,
    protein_per_100g: 30,
    carbs_per_100g: 0,
    fat_per_100g: 8,
    fiber_per_100g: 0,
    sugar_per_100g: null,
    sodium_mg_per_100g: 75,
  },
  grams: 150,
};

const rice: RecipeIngredientNutritionInput = {
  ingredientId: "rice",
  food: { id: "food-rice" },
  facts: {
    food_id: "food-rice",
    calories_per_100g: 130,
    protein_per_100g: 2.5,
    carbs_per_100g: 28,
    fat_per_100g: 0.3,
    fiber_per_100g: 0.4,
    sugar_per_100g: 0.1,
    sodium_mg_per_100g: 1,
  },
  grams: 200,
};

function expectRecipe(
  result: ReturnType<typeof calculateRecipeNutrition>,
): asserts result is Extract<ReturnType<typeof calculateRecipeNutrition>, { ok: true }> {
  expect(result.ok).toBe(true);
}

describe("recipe nutrition", () => {
  it("calculates a one-ingredient recipe from canonical per-100g facts", () => {
    const result = calculateRecipeNutrition([chicken], 1);
    expectRecipe(result);
    expect(result.total.calories_kcal).toBe(300);
    expect(result.total.protein_g).toBe(45);
  });

  it("sums multiple canonical ingredients without AI nutrition", () => {
    const result = calculateRecipeNutrition([chicken, rice], 2);
    expectRecipe(result);
    expect(result.total.calories_kcal).toBe(560);
    expect(result.perServing.calories_kcal).toBe(280);
    expect(result.perServing.carbs_g).toBe(28);
  });

  it("calculates the selected number of recipe servings", () => {
    const result = calculateRecipeNutrition([chicken, rice], 2, 2);
    expectRecipe(result);
    expect(result.loggedQuantity.calories_kcal).toBe(560);
  });

  it("supports fractional recipe servings", () => {
    const result = calculateRecipeNutrition([chicken, rice], 2, 0.5);
    expectRecipe(result);
    expect(result.loggedQuantity.calories_kcal).toBe(140);
  });

  it("does not fabricate optional nutrient totals when an ingredient is missing them", () => {
    const result = calculateRecipeNutrition([chicken, rice], 1);
    expectRecipe(result);
    expect(result.total.sugar_g).toBeNull();
  });

  it("returns the ingredient responsible for missing nutrition facts", () => {
    expect(calculateRecipeNutrition([{ ...chicken, facts: null }], 1)).toEqual({
      ok: false,
      code: "missing_nutrition_facts",
      ingredientId: "chicken",
    });
  });

  it("rejects invalid ingredient grams and recipe servings", () => {
    expect(calculateRecipeNutrition([{ ...chicken, grams: 0 }], 1)).toEqual({
      ok: false,
      code: "invalid_quantity",
      ingredientId: "chicken",
    });
    expect(calculateRecipeNutrition([chicken], 0)).toEqual({
      ok: false,
      code: "invalid_recipe_servings",
    });
  });

  it("builds a logged recipe meal as an immutable final nutrition snapshot", () => {
    const snapshot = buildRecipeMealSnapshot({
      userId: "user-1",
      recipeId: "recipe-1",
      recipeName: "Chicken rice bowl",
      mealType: "lunch",
      recipeServings: 2,
      loggedServings: 1,
      ingredients: [chicken, rice],
    });

    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.meal.calories_kcal).toBe(280);
    expect(mealNutritionMultiplier({ ai_raw: snapshot.meal.ai_raw ?? null, serving_qty: 1 })).toBe(
      1,
    );
  });

  it("keeps an already logged recipe snapshot unchanged after a recipe edit", () => {
    const original = buildRecipeMealSnapshot({
      userId: "user-1",
      recipeId: "recipe-1",
      recipeName: "Chicken rice bowl",
      mealType: "lunch",
      recipeServings: 2,
      loggedServings: 1,
      ingredients: [chicken, rice],
    });
    const edited = calculateRecipeNutrition([{ ...chicken, grams: 300 }, rice], 2);

    expect(original.ok).toBe(true);
    expectRecipe(edited);
    if (!original.ok) return;
    expect(original.meal.calories_kcal).toBe(280);
    expect(edited.perServing.calories_kcal).toBe(430);
  });

  it("calculates a user-provided custom food through the same serving engine", () => {
    const result = resolveCanonicalNutrition(
      { name: "Family sauce", quantity: 2, unit: "tablespoon" },
      {
        food: { id: "custom-food-1" },
        facts: {
          food_id: "custom-food-1",
          calories_per_100g: 80,
          protein_per_100g: 1,
          carbs_per_100g: 10,
          fat_per_100g: 3,
          fiber_per_100g: 0,
          sugar_per_100g: 8,
          sodium_mg_per_100g: 400,
        },
        servings: [{ food_id: "custom-food-1", name: "tablespoon", unit: "tablespoon", grams: 15 }],
      },
    );

    expect(result).toMatchObject({ ok: true, grams: 30 });
    if (result.ok) expect(result.nutrition.calories_kcal).toBe(24);
  });

  it("preserves legacy meal-entry multiplier behavior", () => {
    expect(mealNutritionMultiplier({ ai_raw: null, serving_qty: 2 })).toBe(2);
  });
});

describe("recipe and custom food migration security", () => {
  const migration = readFileSync(
    resolve(__dirname, "../../supabase/migrations/20260923120000_recipes_and_custom_foods.sql"),
    "utf8",
  );

  it("keeps custom foods owner-scoped and explicitly user-provided", () => {
    expect(migration).toMatch(/owner_user_id UUID REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    expect(migration).toMatch(/source = 'user_provided' AND verification_status = 'unverified'/);
    expect(migration).toMatch(/Users manage own custom foods/);
  });

  it("uses ownership policies and atomic RPCs for recipes and custom foods", () => {
    expect(migration).toMatch(/Users manage own recipes/);
    expect(migration).toMatch(/Users manage own recipe ingredients/);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.upsert_custom_food/);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.upsert_recipe/);
  });
});
