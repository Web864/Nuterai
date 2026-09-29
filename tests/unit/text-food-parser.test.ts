import { describe, expect, it } from "vitest";
import { parseTextFoodItems } from "@/features/logging/text-food-parser";

describe("text food parser", () => {
  it("preserves quantity and a food-piece serving", () => {
    expect(parseTextFoodItems("2 eggs")).toEqual([
      { name: "eggs", quantity: 2, unit: "piece" },
    ]);
  });

  it("separates natural-language meal items", () => {
    expect(parseTextFoodItems("I ate 2 eggs with 2 slices bread and one cup tea")).toEqual([
      { name: "eggs", quantity: 2, unit: "piece" },
      { name: "bread", quantity: 2, unit: "slice" },
      { name: "tea", quantity: 1, unit: "cup" },
    ]);
  });

  it("does not turn obvious non-food text into nutrition candidates", () => {
    expect(parseTextFoodItems("I went for a run")).toEqual([]);
  });
});
