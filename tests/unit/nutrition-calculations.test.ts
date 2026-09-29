import { describe, expect, it } from "vitest";
import {
  calculateNutritionFromGrams,
  calculateNutritionFromServing,
  type CanonicalFoodReference,
  type FoodNutritionFacts,
  type FoodServingDefinition,
} from "@/lib/nutrition";

const food: CanonicalFoodReference = { id: "food-1" };
const facts: FoodNutritionFacts = {
  food_id: food.id,
  calories_per_100g: 200,
  protein_per_100g: 10,
  carbs_per_100g: 20,
  fat_per_100g: 8,
  fiber_per_100g: 4,
  sugar_per_100g: 6,
  sodium_mg_per_100g: 120,
};
const serving: FoodServingDefinition = {
  food_id: food.id,
  name: "cup",
  unit: "cup",
  grams: 150,
};

function expectSuccess(
  result: ReturnType<typeof calculateNutritionFromGrams>,
): asserts result is Extract<ReturnType<typeof calculateNutritionFromGrams>, { ok: true }> {
  expect(result.ok).toBe(true);
}

describe("deterministic nutrition calculations", () => {
  it("calculates exact nutrition for 100g", () => {
    const result = calculateNutritionFromGrams(food, facts, 100);

    expectSuccess(result);
    expect(result.grams).toBe(100);
    expect(result.nutrition).toEqual({
      calories_kcal: 200,
      protein_g: 10,
      carbs_g: 20,
      fat_g: 8,
      fiber_g: 4,
      sugar_g: 6,
      sodium_mg: 120,
    });
  });

  it("calculates exact nutrition for 50g", () => {
    const result = calculateNutritionFromGrams(food, facts, 50);

    expectSuccess(result);
    expect(result.nutrition).toMatchObject({
      calories_kcal: 100,
      protein_g: 5,
      carbs_g: 10,
      fat_g: 4,
      fiber_g: 2,
    });
  });

  it("calculates exact nutrition for 150g", () => {
    const result = calculateNutritionFromGrams(food, facts, 150);

    expectSuccess(result);
    expect(result.nutrition).toMatchObject({
      calories_kcal: 300,
      protein_g: 15,
      carbs_g: 30,
      fat_g: 12,
      fiber_g: 6,
    });
  });

  it("supports fractional gram quantities", () => {
    const result = calculateNutritionFromGrams(food, facts, 12.5);

    expectSuccess(result);
    expect(result.nutrition.calories_kcal).toBe(25);
    expect(result.nutrition.protein_g).toBe(1.25);
  });

  it("converts one database-defined serving to grams before calculating", () => {
    const result = calculateNutritionFromServing(food, facts, serving, 1);

    expectSuccess(result);
    expect(result.grams).toBe(150);
    expect(result.nutrition.calories_kcal).toBe(300);
  });

  it("converts multiple database-defined servings", () => {
    const result = calculateNutritionFromServing(food, facts, serving, 2);

    expectSuccess(result);
    expect(result.grams).toBe(300);
    expect(result.nutrition.calories_kcal).toBe(600);
  });

  it("returns a controlled result when facts are missing", () => {
    expect(calculateNutritionFromGrams(food, null, 100)).toEqual({
      ok: false,
      code: "missing_nutrition_facts",
    });
  });

  it("returns a controlled result when a serving conversion is missing", () => {
    expect(calculateNutritionFromServing(food, facts, null, 1)).toEqual({
      ok: false,
      code: "missing_serving_conversion",
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid quantity %p",
    (quantity) => {
      expect(calculateNutritionFromGrams(food, facts, quantity)).toEqual({
        ok: false,
        code: "invalid_quantity",
      });
    },
  );

  it("preserves optional sugar and sodium when facts provide them", () => {
    const result = calculateNutritionFromGrams(food, facts, 50);

    expectSuccess(result);
    expect(result.nutrition.sugar_g).toBe(3);
    expect(result.nutrition.sodium_mg).toBe(60);
  });
});
