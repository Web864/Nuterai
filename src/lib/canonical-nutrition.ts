import type { Tables } from "@/integrations/supabase/types";
import {
  calculateNutritionFromGrams,
  calculateNutritionFromServing,
  type CalculatedFoodNutrition,
  type CanonicalFoodReference,
  type FoodNutritionFacts,
  type FoodServingDefinition,
  type NutritionCalculationErrorCode,
} from "@/lib/nutrition";

export type NutritionCandidate = {
  name: string;
  quantity: number;
  unit: string | null | undefined;
};

export type CanonicalFoodNutritionData = {
  food: CanonicalFoodReference;
  facts: FoodNutritionFacts | null | undefined;
  servings: FoodServingDefinition[];
};

export type CanonicalNutritionResolution =
  | {
      ok: true;
      foodId: string;
      grams: number;
      nutrition: CalculatedFoodNutrition;
    }
  | { ok: false; code: "no_canonical_match" | NutritionCalculationErrorCode };

const GRAM_UNITS = new Set(["g", "gram", "grams", "gramme", "grammes"]);

export function normalizeFoodText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function foodNameVariants(value: string): string[] {
  const normalized = normalizeFoodText(value);
  if (!normalized) return [];

  const singular = singularizeFinalWord(normalized);
  return singular && singular !== normalized ? [normalized, singular] : [normalized];
}

function singularizeFinalWord(value: string): string | null {
  const words = value.split(" ");
  const last = words.at(-1);
  if (!last || last.length < 4) return null;

  let singular: string | null = null;
  if (last.endsWith("ies") && last.length > 4) singular = `${last.slice(0, -3)}y`;
  else if (["tomatoes", "potatoes"].includes(last)) singular = last.slice(0, -2);
  else if (
    last.endsWith("s") &&
    !last.endsWith("ss") &&
    !last.endsWith("us") &&
    !last.endsWith("is")
  ) {
    singular = last.slice(0, -1);
  }

  return singular ? [...words.slice(0, -1), singular].join(" ") : null;
}

export function resolveCanonicalNutrition(
  candidate: NutritionCandidate,
  data: CanonicalFoodNutritionData | null | undefined,
): CanonicalNutritionResolution {
  if (!data) return { ok: false, code: "no_canonical_match" };

  const normalizedUnit = normalizeFoodText(candidate.unit ?? "");
  const calculation = GRAM_UNITS.has(normalizedUnit)
    ? calculateNutritionFromGrams(data.food, data.facts, candidate.quantity)
    : calculateNutritionFromServing(
        data.food,
        data.facts,
        findServing(data.servings, normalizedUnit),
        candidate.quantity,
      );

  if (!calculation.ok) return calculation;

  return {
    ok: true,
    foodId: calculation.foodId,
    grams: calculation.grams,
    nutrition: calculation.nutrition,
  };
}

function findServing(
  servings: FoodServingDefinition[],
  normalizedUnit: string,
): FoodServingDefinition | null {
  const exact = servings.filter(
    (serving) =>
      normalizeFoodText(serving.name) === normalizedUnit ||
      normalizeFoodText(serving.unit) === normalizedUnit,
  );
  if (exact.length === 1) return exact[0];

  if (normalizedUnit === "serving") {
    const defaults = servings.filter((serving) => (serving as Tables<"food_servings">).is_default);
    if (defaults.length === 1) return defaults[0];
  }

  return null;
}
