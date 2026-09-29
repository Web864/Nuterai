import { describe, expect, it } from "vitest";
import {
  resolveCanonicalNutrition,
  type CanonicalFoodNutritionData,
} from "@/lib/canonical-nutrition";
import {
  applyCanonicalNutritionSnapshot,
  mealNutritionMultiplier,
} from "@/features/logging/nutrition-contract";

const foodData: CanonicalFoodNutritionData = {
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
  servings: [{ food_id: "food-chicken", name: "cup", unit: "cup", grams: 150 }],
};

function expectResolved(
  result: ReturnType<typeof resolveCanonicalNutrition>,
): asserts result is Extract<ReturnType<typeof resolveCanonicalNutrition>, { ok: true }> {
  expect(result.ok).toBe(true);
}

describe("meal nutrition integration", () => {
  it("resolves a canonical food at 100g", () => {
    const result = resolveCanonicalNutrition(
      { name: "Chicken breast", quantity: 100, unit: "g" },
      foodData,
    );

    expectResolved(result);
    expect(result.nutrition.calories_kcal).toBe(200);
    expect(result.nutrition.protein_g).toBe(30);
  });

  it("resolves a canonical food at 50g", () => {
    const result = resolveCanonicalNutrition(
      { name: "Chicken breast", quantity: 50, unit: "grams" },
      foodData,
    );

    expectResolved(result);
    expect(result.nutrition).toMatchObject({ calories_kcal: 100, protein_g: 15 });
  });

  it("uses a database serving definition", () => {
    const result = resolveCanonicalNutrition(
      { name: "Chicken breast", quantity: 1, unit: "cup" },
      foodData,
    );

    expectResolved(result);
    expect(result.grams).toBe(150);
    expect(result.nutrition.calories_kcal).toBe(300);
  });

  it("calculates multiple database servings", () => {
    const result = resolveCanonicalNutrition(
      { name: "Chicken breast", quantity: 2, unit: "cup" },
      foodData,
    );

    expectResolved(result);
    expect(result.grams).toBe(300);
    expect(result.nutrition.calories_kcal).toBe(600);
  });

  it("uses canonical nutrition for an AI text candidate when available", () => {
    const result = resolveCanonicalNutrition(
      { name: "Grilled chicken", quantity: 1, unit: "cup" },
      foodData,
    );

    expectResolved(result);
    expect(result.foodId).toBe("food-chicken");
    expect(result.nutrition.protein_g).toBe(45);
  });

  it("returns a controlled fallback result when an AI candidate cannot resolve", () => {
    expect(
      resolveCanonicalNutrition({ name: "Unknown dish", quantity: 1, unit: "serving" }, null),
    ).toEqual({ ok: false, code: "no_canonical_match" });
  });

  it("uses canonical nutrition for a photo candidate", () => {
    const result = resolveCanonicalNutrition(
      { name: "Chicken in photo", quantity: 1, unit: "cup" },
      foodData,
    );

    expectResolved(result);
    expect(result.nutrition.fat_g).toBe(12);
  });

  it("recalculates canonical nutrition when a photo quantity is edited", () => {
    const oneCup = resolveCanonicalNutrition(
      { name: "Chicken", quantity: 1, unit: "cup" },
      foodData,
    );
    const twoCups = resolveCanonicalNutrition(
      { name: "Chicken", quantity: 2, unit: "cup" },
      foodData,
    );

    expectResolved(oneCup);
    expectResolved(twoCups);
    expect(twoCups.nutrition.calories_kcal).toBe(oneCup.nutrition.calories_kcal * 2);
  });

  it("marks final canonical nutrition snapshots so they are not double-scaled", () => {
    const resolution = resolveCanonicalNutrition(
      { name: "Chicken", quantity: 2, unit: "cup" },
      foodData,
    );
    expectResolved(resolution);

    const row = applyCanonicalNutritionSnapshot(
      {
        user_id: "user-1",
        name: "Chicken",
        serving_qty: 2,
        serving_unit: "cup",
        calories_kcal: 999,
        protein_g: 999,
        carbs_g: 999,
        fat_g: 999,
        fiber_g: 999,
      },
      resolution,
    );

    expect(row.calories_kcal).toBe(600);
    expect(mealNutritionMultiplier({ ai_raw: row.ai_raw ?? null, serving_qty: 2 })).toBe(1);
  });

  it("keeps legacy meal entries on their existing serving multiplier", () => {
    expect(mealNutritionMultiplier({ ai_raw: null, serving_qty: 2 })).toBe(2);
  });

  it("returns a controlled result when canonical nutrition facts are missing", () => {
    expect(
      resolveCanonicalNutrition(
        { name: "Chicken", quantity: 100, unit: "g" },
        { ...foodData, facts: null },
      ),
    ).toEqual({ ok: false, code: "missing_nutrition_facts" });
  });

  it("returns a controlled result for an unavailable serving conversion", () => {
    expect(
      resolveCanonicalNutrition({ name: "Chicken", quantity: 1, unit: "slice" }, foodData),
    ).toEqual({ ok: false, code: "missing_serving_conversion" });
  });
});
