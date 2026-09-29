import { describe, expect, it } from "vitest";
import type { MealEntry } from "@/features/logging/queries";
import {
  recentLocalDates,
  summarizeNutritionWeek,
  sumNutritionSnapshots,
} from "@/features/logging/nutrition-summary";
import { FINAL_NUTRITION_SNAPSHOT_CONTRACT } from "@/features/logging/nutrition-contract";

function meal(overrides: Partial<MealEntry> = {}): MealEntry {
  return {
    id: "meal-1",
    user_id: "user-1",
    name: "Chicken bowl",
    meal_type: "lunch",
    source: "manual",
    logged_at: "2026-09-24T12:00:00.000Z",
    logged_date: "2026-09-24",
    serving_qty: 1,
    serving_unit: "serving",
    calories_kcal: 200,
    protein_g: 20,
    carbs_g: 10,
    fat_g: 8,
    fiber_g: 3,
    sugar_g: 2,
    sodium_mg: 100,
    ai_confidence: null,
    ai_model: null,
    ai_raw: null,
    barcode: null,
    brand: null,
    created_at: "2026-09-24T12:00:00.000Z",
    description: null,
    image_url: null,
    updated_at: "2026-09-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("nutrition dashboard summaries", () => {
  it("keeps legacy meals on the established serving multiplier", () => {
    const totals = sumNutritionSnapshots([meal({ serving_qty: 2 })]);
    expect(totals).toMatchObject({ calories: 400, protein: 40, carbs: 20, fat: 16, fiber: 6 });
  });

  it("does not double-scale a logged_quantity_v1 meal", () => {
    const totals = sumNutritionSnapshots([
      meal({
        serving_qty: 2,
        calories_kcal: 350,
        protein_g: 35,
        ai_raw: { nutrition_contract: FINAL_NUTRITION_SNAPSHOT_CONTRACT },
      }),
    ]);
    expect(totals.calories).toBe(350);
    expect(totals.protein).toBe(35);
  });

  it("includes immutable recipe and custom-food snapshots through the same aggregation", () => {
    const totals = sumNutritionSnapshots([
      meal({
        id: "recipe",
        name: "Chicken rice bowl",
        source: "recipe",
        serving_qty: 0.5,
        calories_kcal: 140,
        protein_g: 23.75,
        ai_raw: { nutrition_contract: FINAL_NUTRITION_SNAPSHOT_CONTRACT, recipe_id: "recipe-1" },
      }),
      meal({
        id: "custom",
        name: "Family sauce",
        source: "manual",
        calories_kcal: 24,
        protein_g: 0.3,
        ai_raw: {
          nutrition_contract: FINAL_NUTRITION_SNAPSHOT_CONTRACT,
          canonical_food_id: "custom-1",
        },
      }),
    ]);
    expect(totals.calories).toBe(164);
    expect(totals.protein).toBeCloseTo(24.05);
  });

  it("keeps optional nutrient totals unknown when any snapshot is incomplete", () => {
    const totals = sumNutritionSnapshots([
      meal(),
      meal({ id: "missing", sugar_g: null, sodium_mg: null }),
    ]);
    expect(totals.sugar).toBeNull();
    expect(totals.sodium).toBeNull();
    expect(totals.calories).toBe(400);
  });

  it("creates daily totals and weekly averages from logged days only", () => {
    const summary = summarizeNutritionWeek(
      [
        meal({ id: "day-one", logged_date: "2026-09-20", calories_kcal: 200, protein_g: 20 }),
        meal({
          id: "day-one-second",
          logged_date: "2026-09-20",
          calories_kcal: 100,
          protein_g: 10,
        }),
        meal({ id: "today", logged_date: "2026-09-24", calories_kcal: 500, protein_g: 50 }),
      ],
      "2026-09-24",
    );

    expect(summary.daysLogged).toBe(2);
    expect(summary.daily.find((day) => day.date === "2026-09-20")).toMatchObject({
      mealCount: 2,
      calories: 300,
      protein: 30,
    });
    expect(summary.average.calories).toBe(400);
    expect(summary.average.protein).toBe(40);
  });

  it("uses stored goal targets only as a comparison value", () => {
    const summary = summarizeNutritionWeek([meal({ calories_kcal: 500 })], "2026-09-24");
    const dailyCalorieTarget = 500;
    expect(summary.average.calories).toBe(dailyCalorieTarget);
  });

  it("reports food and recipe logging frequency from the scoped week", () => {
    const summary = summarizeNutritionWeek(
      [
        meal({ id: "food-one", name: "Apple" }),
        meal({ id: "food-two", name: "apple" }),
        meal({ id: "recipe-one", name: "Rice bowl", source: "recipe" }),
      ],
      "2026-09-24",
    );
    expect(summary.mostLoggedFood).toMatchObject({ name: "Apple", count: 2 });
    expect(summary.mostLoggedRecipe).toMatchObject({ name: "Rice bowl", count: 1 });
  });

  it("has stable local date boundaries and empty-day behavior", () => {
    expect(recentLocalDates("2026-01-02", 3)).toEqual(["2025-12-31", "2026-01-01", "2026-01-02"]);
    const summary = summarizeNutritionWeek([], "2026-09-24");
    expect(summary.daysLogged).toBe(0);
    expect(summary.daily).toHaveLength(7);
    expect(summary.average).toMatchObject({ calories: 0, protein: 0, sugar: null, sodium: null });
  });

  it("does not mutate historical meal snapshots while summarizing", () => {
    const historicalMeal = meal({ serving_qty: 2, calories_kcal: 100, ai_raw: null });
    const before = structuredClone(historicalMeal);
    summarizeNutritionWeek([historicalMeal], "2026-09-24");
    expect(historicalMeal).toEqual(before);
  });
});
