import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  foodNameVariants,
  normalizeFoodText,
  resolveCanonicalNutrition,
  type CanonicalNutritionResolution,
  type NutritionCandidate,
} from "@/lib/canonical-nutrition";

type AccessibleFood = Pick<
  Tables<"foods">,
  | "id"
  | "canonical_name"
  | "normalized_name"
  | "owner_user_id"
  | "source"
  | "source_id"
  | "verification_status"
>;
type AccessibleAlias = Pick<
  Tables<"food_aliases">,
  "food_id" | "alias" | "normalized_alias" | "locale"
>;

export type FoodResolutionCandidate = {
  foodId: string;
  canonicalName: string;
  match: "canonical" | "alias" | "normalized" | "locale_alias" | "fuzzy";
  source: string;
  sourceId: string | null;
  verificationStatus: string;
  isCustom: boolean;
};

export type CanonicalFoodLookupResult =
  | CanonicalNutritionResolution
  | { ok: false; code: "lookup_failed" }
  | { ok: false; code: "ambiguous_match"; candidates: FoodResolutionCandidate[] };

type FoodNameMatch =
  | { kind: "resolved"; candidate: FoodResolutionCandidate }
  | { kind: "ambiguous"; candidates: FoodResolutionCandidate[] }
  | { kind: "unresolved" };

/**
 * Canonical nutrition is an enhancement, never a logging prerequisite. A
 * lookup problem intentionally returns a controlled result so callers keep
 * their established AI/manual/Open Food Facts nutrition fallback.
 */
export async function resolveCanonicalFoodNutrition(
  candidate: NutritionCandidate,
  options: { locale?: string } = {},
): Promise<CanonicalFoodLookupResult> {
  const normalizedNames = foodNameVariants(candidate.name);
  if (!normalizedNames.length) return { ok: false, code: "no_canonical_match" };

  try {
    const matches = await fetchNameCandidates(candidate.name, normalizedNames);
    const locale =
      options.locale ?? (typeof navigator === "undefined" ? undefined : navigator.language);
    const nameMatch = rankFoodNameMatch(candidate.name, matches.foods, matches.aliases, locale);
    if (nameMatch.kind === "unresolved") return { ok: false, code: "no_canonical_match" };
    if (nameMatch.kind === "ambiguous") {
      return { ok: false, code: "ambiguous_match", candidates: nameMatch.candidates };
    }

    const foodId = nameMatch.candidate.foodId;
    const [factsResult, servingsResult] = await Promise.all([
      supabase.from("food_nutrition_facts").select("*").eq("food_id", foodId).maybeSingle(),
      supabase.from("food_servings").select("*").eq("food_id", foodId),
    ]);
    if (factsResult.error || servingsResult.error) return { ok: false, code: "lookup_failed" };

    return resolveCanonicalNutrition(candidate, {
      food: { id: foodId },
      facts: factsResult.data,
      servings: servingsResult.data ?? [],
    });
  } catch {
    return { ok: false, code: "lookup_failed" };
  }
}

export async function resolveCanonicalFoodNutritionById(
  candidate: NutritionCandidate,
  foodId: string,
): Promise<CanonicalFoodLookupResult> {
  try {
    const [foodResult, factsResult, servingsResult] = await Promise.all([
      supabase.from("foods").select("id").eq("id", foodId).maybeSingle(),
      supabase.from("food_nutrition_facts").select("*").eq("food_id", foodId).maybeSingle(),
      supabase.from("food_servings").select("*").eq("food_id", foodId),
    ]);
    if (foodResult.error || factsResult.error || servingsResult.error) {
      return { ok: false, code: "lookup_failed" };
    }
    if (!foodResult.data) return { ok: false, code: "no_canonical_match" };
    return resolveCanonicalNutrition(candidate, {
      food: { id: foodResult.data.id },
      facts: factsResult.data,
      servings: servingsResult.data ?? [],
    });
  } catch {
    return { ok: false, code: "lookup_failed" };
  }
}
export function rankFoodNameMatch(
  input: string,
  foods: AccessibleFood[],
  aliases: AccessibleAlias[],
  locale?: string,
): FoodNameMatch {
  const normalizedVariants = new Set(foodNameVariants(input));
  const raw = input.trim().toLocaleLowerCase();
  if (!raw || !normalizedVariants.size) return { kind: "unresolved" };

  const aliasesByFood = new Map<string, AccessibleAlias[]>();
  for (const alias of aliases) {
    const values = aliasesByFood.get(alias.food_id) ?? [];
    values.push(alias);
    aliasesByFood.set(alias.food_id, values);
  }

  const byPriority = new Map<number, FoodResolutionCandidate[]>();
  for (const food of foods) {
    const foodAliases = aliasesByFood.get(food.id) ?? [];
    const priority = matchPriority(raw, normalizedVariants, food, foodAliases, locale);
    if (!priority) continue;
    const candidate = toCandidate(food, priority.match);
    const values = byPriority.get(priority.value) ?? [];
    values.push(candidate);
    byPriority.set(priority.value, values);
  }

  if (!byPriority.size) return { kind: "unresolved" };
  const highestPriority = Math.max(...byPriority.keys());
  const best = deduplicateCandidates(byPriority.get(highestPriority) ?? []);
  if (best.length !== 1) return { kind: "ambiguous", candidates: best };

  if (highestPriority !== 100) return { kind: "resolved", candidate: best[0] };

  const fuzzyCandidates = best.filter((candidate) => {
    const food = foods.find((entry) => entry.id === candidate.foodId);
    return food ? fuzzySimilarity(normalizeFoodText(input), food.normalized_name) >= 0.93 : false;
  });
  if (fuzzyCandidates.length === 1) return { kind: "resolved", candidate: fuzzyCandidates[0] };
  // A broad textual candidate is useful for confirmation, but never enough to
  // replace nutrition automatically unless it clears the strict threshold.
  return { kind: "ambiguous", candidates: best };
}

async function fetchNameCandidates(
  rawInput: string,
  normalizedNames: string[],
): Promise<{ foods: AccessibleFood[]; aliases: AccessibleAlias[] }> {
  const normalizedFoodResult = await supabase
    .from("foods")
    .select(
      "id, canonical_name, normalized_name, owner_user_id, source, source_id, verification_status",
    )
    .in("normalized_name", normalizedNames)
    .limit(12);
  const normalizedAliasResult = await supabase
    .from("food_aliases")
    .select("food_id, alias, normalized_alias, locale")
    .in("normalized_alias", normalizedNames)
    .limit(24);
  if (normalizedFoodResult.error || normalizedAliasResult.error) {
    throw normalizedFoodResult.error ?? normalizedAliasResult.error;
  }

  const foodIds = new Set<string>((normalizedFoodResult.data ?? []).map((food) => food.id));
  for (const alias of normalizedAliasResult.data ?? []) foodIds.add(alias.food_id);

  // Only use a broad candidate query after exact/normalized matching misses.
  // The pure ranker below never auto-selects a low-confidence fuzzy candidate.
  if (!foodIds.size && rawInput.trim().length >= 3) {
    const term = escapeIlike(rawInput.trim());
    const prefix = escapeIlike(normalizedNames[0]?.slice(0, 3) ?? "");
    const [fuzzyFoodsResult, fuzzyAliasesResult, prefixFoodsResult, prefixAliasesResult] =
      await Promise.all([
        supabase
          .from("foods")
          .select(
            "id, canonical_name, normalized_name, owner_user_id, source, source_id, verification_status",
          )
          .ilike("canonical_name", `%${term}%`)
          .limit(12),
        supabase
          .from("food_aliases")
          .select("food_id, alias, normalized_alias, locale")
          .ilike("alias", `%${term}%`)
          .limit(24),
        supabase
          .from("foods")
          .select(
            "id, canonical_name, normalized_name, owner_user_id, source, source_id, verification_status",
          )
          .ilike("normalized_name", `${prefix}%`)
          .limit(12),
        supabase
          .from("food_aliases")
          .select("food_id, alias, normalized_alias, locale")
          .ilike("normalized_alias", `${prefix}%`)
          .limit(24),
      ]);
    if (
      fuzzyFoodsResult.error ||
      fuzzyAliasesResult.error ||
      prefixFoodsResult.error ||
      prefixAliasesResult.error
    ) {
      throw (
        fuzzyFoodsResult.error ??
        fuzzyAliasesResult.error ??
        prefixFoodsResult.error ??
        prefixAliasesResult.error
      );
    }
    for (const food of fuzzyFoodsResult.data ?? []) foodIds.add(food.id);
    for (const alias of fuzzyAliasesResult.data ?? []) foodIds.add(alias.food_id);
    for (const food of prefixFoodsResult.data ?? []) foodIds.add(food.id);
    for (const alias of prefixAliasesResult.data ?? []) foodIds.add(alias.food_id);
  }

  if (!foodIds.size) return { foods: [], aliases: [] };
  const ids = [...foodIds];
  const [foodsResult, aliasesResult] = await Promise.all([
    supabase
      .from("foods")
      .select(
        "id, canonical_name, normalized_name, owner_user_id, source, source_id, verification_status",
      )
      .in("id", ids),
    supabase
      .from("food_aliases")
      .select("food_id, alias, normalized_alias, locale")
      .in("food_id", ids),
  ]);
  if (foodsResult.error || aliasesResult.error) throw foodsResult.error ?? aliasesResult.error;
  return { foods: foodsResult.data ?? [], aliases: aliasesResult.data ?? [] };
}

function matchPriority(
  raw: string,
  normalizedVariants: Set<string>,
  food: AccessibleFood,
  aliases: AccessibleAlias[],
  locale?: string,
): { value: number; match: FoodResolutionCandidate["match"] } | null {
  if (food.canonical_name.trim().toLocaleLowerCase() === raw)
    return { value: 600, match: "canonical" };

  const exactAliases = aliases.filter((alias) => alias.alias.trim().toLocaleLowerCase() === raw);
  if (exactAliases.some((alias) => locale && alias.locale === locale)) {
    return { value: 500, match: "locale_alias" };
  }
  if (exactAliases.length) return { value: 400, match: "alias" };

  if (normalizedVariants.has(food.normalized_name)) return { value: 300, match: "normalized" };
  if (
    aliases.some(
      (alias) =>
        normalizedVariants.has(alias.normalized_alias) && locale && alias.locale === locale,
    )
  ) {
    return { value: 250, match: "locale_alias" };
  }
  if (aliases.some((alias) => normalizedVariants.has(alias.normalized_alias))) {
    return { value: 200, match: "normalized" };
  }

  const normalizedInput = [...normalizedVariants][0];
  const fuzzyNames = [food.normalized_name, ...aliases.map((alias) => alias.normalized_alias)];
  return fuzzyNames.some(
    (name) =>
      fuzzySimilarity(normalizedInput, name) >= 0.93 ||
      name.includes(normalizedInput) ||
      normalizedInput.includes(name),
  )
    ? { value: 100, match: "fuzzy" }
    : null;
}

function toCandidate(
  food: AccessibleFood,
  match: FoodResolutionCandidate["match"],
): FoodResolutionCandidate {
  return {
    foodId: food.id,
    canonicalName: food.canonical_name,
    match,
    source: food.source,
    sourceId: food.source_id,
    verificationStatus: food.verification_status,
    isCustom: food.owner_user_id !== null,
  };
}

function deduplicateCandidates(candidates: FoodResolutionCandidate[]): FoodResolutionCandidate[] {
  return [...new Map(candidates.map((candidate) => [candidate.foodId, candidate])).values()];
}

function fuzzySimilarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLength = Math.max(left.length, right.length);
  const distance = levenshteinDistance(left, right);
  return 1 - distance / maxLength;
}

function levenshteinDistance(left: string, right: string): number {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + Number(left[leftIndex - 1] !== right[rightIndex - 1]),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
