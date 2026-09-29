import type { MealEntry } from "@/features/logging/queries";
import { mealNutritionMultiplier } from "@/features/logging/nutrition-contract";

export type MealNutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodium: number | null;
};

export type DailyNutritionSummary = MealNutritionTotals & {
  date: string;
  mealCount: number;
};

export type WeeklyNutritionSummary = {
  startDate: string;
  endDate: string;
  daysLogged: number;
  average: MealNutritionTotals;
  daily: DailyNutritionSummary[];
  mostLoggedFood: { name: string; count: number } | null;
  mostLoggedRecipe: { name: string; count: number } | null;
};

export function sumNutritionSnapshots(meals: MealEntry[]): MealNutritionTotals {
  let sugar = 0;
  let sodium = 0;
  let hasUnknownSugar = false;
  let hasUnknownSodium = false;

  const totals = meals.reduce(
    (acc, meal) => {
      const multiplier = mealNutritionMultiplier(meal);
      acc.calories += valueOrZero(meal.calories_kcal) * multiplier;
      acc.protein += valueOrZero(meal.protein_g) * multiplier;
      acc.carbs += valueOrZero(meal.carbs_g) * multiplier;
      acc.fat += valueOrZero(meal.fat_g) * multiplier;
      acc.fiber += valueOrZero(meal.fiber_g) * multiplier;

      if (isFiniteNumber(meal.sugar_g)) sugar += meal.sugar_g * multiplier;
      else hasUnknownSugar = true;

      if (isFiniteNumber(meal.sodium_mg)) sodium += meal.sodium_mg * multiplier;
      else hasUnknownSodium = true;

      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return {
    ...totals,
    sugar: meals.length === 0 || hasUnknownSugar ? null : sugar,
    sodium: meals.length === 0 || hasUnknownSodium ? null : sodium,
  };
}

export function summarizeNutritionWeek(
  meals: MealEntry[],
  endDate: string,
  dayCount = 7,
): WeeklyNutritionSummary {
  const dates = recentLocalDates(endDate, dayCount);
  const mealsByDate = new Map<string, MealEntry[]>();
  for (const meal of meals) {
    if (!dates.includes(meal.logged_date)) continue;
    const matchingMeals = mealsByDate.get(meal.logged_date) ?? [];
    matchingMeals.push(meal);
    mealsByDate.set(meal.logged_date, matchingMeals);
  }

  const scopedMeals = meals.filter((meal) => dates.includes(meal.logged_date));
  const daily = dates.map((date) => {
    const dayMeals = mealsByDate.get(date) ?? [];
    return { date, mealCount: dayMeals.length, ...sumNutritionSnapshots(dayMeals) };
  });
  const loggedDays = daily.filter((day) => day.mealCount > 0);
  const aggregate = sumNutritionSnapshots(scopedMeals);
  const denominator = loggedDays.length;

  return {
    startDate: dates[0] ?? endDate,
    endDate,
    daysLogged: denominator,
    average: averageNutritionTotals(aggregate, denominator),
    daily,
    mostLoggedFood: mostFrequent(scopedMeals, (meal) => meal.source !== "recipe"),
    mostLoggedRecipe: mostFrequent(scopedMeals, (meal) => meal.source === "recipe"),
  };
}

export function recentLocalDates(endDate: string, dayCount = 7): string[] {
  const [year, month, day] = endDate.split("-").map(Number);
  if (!year || !month || !day || !Number.isInteger(dayCount) || dayCount < 1) return [];

  return Array.from({ length: dayCount }, (_, index) => {
    const value = new Date(year, month - 1, day - (dayCount - 1 - index));
    return formatLocalDate(value);
  });
}

function averageNutritionTotals(
  totals: MealNutritionTotals,
  daysLogged: number,
): MealNutritionTotals {
  if (daysLogged === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: null, sodium: null };
  }

  return {
    calories: totals.calories / daysLogged,
    protein: totals.protein / daysLogged,
    carbs: totals.carbs / daysLogged,
    fat: totals.fat / daysLogged,
    fiber: totals.fiber / daysLogged,
    sugar: totals.sugar === null ? null : totals.sugar / daysLogged,
    sodium: totals.sodium === null ? null : totals.sodium / daysLogged,
  };
}

function mostFrequent(
  meals: MealEntry[],
  include: (meal: MealEntry) => boolean,
): { name: string; count: number } | null {
  const counts = new Map<string, { name: string; count: number }>();
  for (const meal of meals) {
    if (!include(meal)) continue;
    const name = meal.name.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    const current = counts.get(key) ?? { name, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }

  return (
    [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0] ??
    null
  );
}

function valueOrZero(value: number | null): number {
  return isFiniteNumber(value) ? value : 0;
}

function isFiniteNumber(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
