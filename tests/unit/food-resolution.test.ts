import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rankFoodNameMatch } from "@/features/logging/food-resolution";
import { foodNameVariants, resolveCanonicalNutrition } from "@/lib/canonical-nutrition";

const genericEggplant = {
  id: "eggplant",
  canonical_name: "Eggplant, raw",
  normalized_name: "eggplant raw",
  owner_user_id: null,
  source: "usda_fdc",
  source_id: "123",
  verification_status: "verified",
};

function ranked(
  input: string,
  foods = [genericEggplant],
  aliases: Array<{
    food_id: string;
    alias: string;
    normalized_alias: string;
    locale: string | null;
  }> = [],
  locale?: string,
) {
  return rankFoodNameMatch(input, foods, aliases, locale);
}

describe("international food resolution", () => {
  it("resolves an exact canonical name before aliases", () => {
    const result = ranked("Eggplant, raw");
    expect(result).toMatchObject({
      kind: "resolved",
      candidate: { foodId: "eggplant", match: "canonical" },
    });
  });

  it("resolves exact aliases case-insensitively", () => {
    const result = ranked(
      "COOKED AUBERGINE",
      [genericEggplant],
      [
        {
          food_id: "eggplant",
          alias: "Cooked aubergine",
          normalized_alias: "cooked aubergine",
          locale: "en-GB",
        },
      ],
    );
    expect(result).toMatchObject({ kind: "resolved", candidate: { match: "alias" } });
  });

  it("normalizes whitespace, punctuation, accents, and safe plural variants", () => {
    expect(foodNameVariants("  Crème---Brûlées  ")).toContain("creme brulee");
    const food = {
      ...genericEggplant,
      canonical_name: "Tomato",
      normalized_name: "tomato",
    };
    expect(ranked("  TOMATOES ", [food])).toMatchObject({
      kind: "resolved",
      candidate: { match: "normalized" },
    });
  });

  it("resolves a reliable international alias without changing the canonical name", () => {
    const result = ranked(
      "brinjal",
      [genericEggplant],
      [
        { food_id: "eggplant", alias: "Brinjal", normalized_alias: "brinjal", locale: "en-IN" },
        { food_id: "eggplant", alias: "Aubergine", normalized_alias: "aubergine", locale: "en-GB" },
      ],
    );
    expect(result).toMatchObject({
      kind: "resolved",
      candidate: { canonicalName: "Eggplant, raw", match: "alias" },
    });
  });

  it("prefers a locale-aware alias when the same word maps to distinct foods", () => {
    const pepper = {
      ...genericEggplant,
      id: "pepper",
      canonical_name: "Bell pepper, raw",
      normalized_name: "bell pepper raw",
    };
    const result = ranked(
      "pepper",
      [genericEggplant, pepper],
      [
        { food_id: "eggplant", alias: "pepper", normalized_alias: "pepper", locale: "en-GB" },
        { food_id: "pepper", alias: "pepper", normalized_alias: "pepper", locale: "en-US" },
      ],
      "en-US",
    );
    expect(result).toMatchObject({
      kind: "resolved",
      candidate: { foodId: "pepper", match: "locale_alias" },
    });
  });

  it("returns candidates instead of auto-selecting an ambiguous match", () => {
    const pepper = {
      ...genericEggplant,
      id: "pepper",
      canonical_name: "Bell pepper, raw",
      normalized_name: "bell pepper raw",
    };
    const result = ranked(
      "pepper",
      [genericEggplant, pepper],
      [
        { food_id: "eggplant", alias: "pepper", normalized_alias: "pepper", locale: "en-GB" },
        { food_id: "pepper", alias: "pepper", normalized_alias: "pepper", locale: "en-US" },
      ],
    );
    expect(result).toMatchObject({ kind: "ambiguous" });
  });

  it("does not auto-select a low-confidence partial match", () => {
    const chickpeas = {
      ...genericEggplant,
      id: "chickpeas",
      canonical_name: "Chickpeas, cooked, without salt",
      normalized_name: "chickpeas cooked without salt",
    };
    expect(ranked("chickpeas", [chickpeas])).toMatchObject({ kind: "ambiguous" });
  });

  it("keeps user custom foods owner-scoped in result metadata", () => {
    const custom = {
      ...genericEggplant,
      id: "custom",
      canonical_name: "Family sauce",
      normalized_name: "family sauce",
      owner_user_id: "user-1",
      source: "user_provided",
      source_id: null,
      verification_status: "unverified",
    };
    expect(ranked("family sauce", [custom])).toMatchObject({
      kind: "resolved",
      candidate: { isCustom: true },
    });
  });

  it("keeps branded and generic records separate when both are equally named", () => {
    const branded = {
      ...genericEggplant,
      id: "brand",
      source: "openfoodfacts",
      source_id: "barcode-1",
    };
    expect(ranked("Eggplant, raw", [genericEggplant, branded])).toMatchObject({
      kind: "ambiguous",
    });
  });

  it("retains deterministic nutrition and controlled missing-data failures", () => {
    const result = resolveCanonicalNutrition(
      { name: "Eggplant", quantity: 100, unit: "g" },
      {
        food: { id: "eggplant" },
        facts: {
          food_id: "eggplant",
          calories_per_100g: 25,
          protein_per_100g: 1,
          carbs_per_100g: 6,
          fat_per_100g: 0.2,
          fiber_per_100g: 3,
          sugar_per_100g: null,
          sodium_mg_per_100g: null,
        },
        servings: [],
      },
    );
    expect(result).toMatchObject({ ok: true, nutrition: { calories_kcal: 25, protein_g: 1 } });
    expect(resolveCanonicalNutrition({ name: "Eggplant", quantity: 1, unit: "cup" }, null)).toEqual(
      { ok: false, code: "no_canonical_match" },
    );
  });

  it("keeps Open Food Facts while Gemini meal snapshots save directly", () => {
    const vision = readFileSync(resolve(__dirname, "../../src/lib/ai-vision.functions.ts"), "utf8");
    const logging = readFileSync(
      resolve(__dirname, "../../src/routes/_authenticated/log.tsx"),
      "utf8",
    );
    expect(vision).toContain('source: "openfoodfacts"');
    expect(logging).toContain('nutrition_contract: "logged_quantity_v1"');
  });

  it("keeps source identity duplicate protection additive", () => {
    const migration = readFileSync(
      resolve(
        __dirname,
        "../../supabase/migrations/20260924110000_international_food_resolution.sql",
      ),
      "utf8",
    );
    expect(migration).toContain("foods_global_source_normalized_name_key");
    expect(migration).toContain("ON CONFLICT (source, source_id)");
    expect(migration).toContain("Meal snapshots are");
  });
});
