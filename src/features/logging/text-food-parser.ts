export type ParsedTextFoodItem = {
  name: string;
  quantity: number;
  unit: string;
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const UNITS = new Map([
  ["g", "g"],
  ["gram", "g"],
  ["grams", "g"],
  ["kg", "kg"],
  ["cup", "cup"],
  ["cups", "cup"],
  ["slice", "slice"],
  ["slices", "slice"],
  ["piece", "piece"],
  ["pieces", "piece"],
  ["plate", "plate"],
  ["plates", "plate"],
  ["bowl", "bowl"],
  ["bowls", "bowl"],
  ["glass", "glass"],
  ["glasses", "glass"],
  ["tablespoon", "tablespoon"],
  ["tbsp", "tablespoon"],
  ["teaspoon", "teaspoon"],
  ["tsp", "teaspoon"],
]);

const NON_FOOD = /\b(?:hello|thanks|thank you|meeting|email|walked|running|run|slept|work)\b/i;

export function parseTextFoodItems(input: string): ParsedTextFoodItem[] {
  const normalized = input
    .trim()
    .replace(/^\s*(?:i\s+)?(?:ate|had|logged|consumed)\s+/i, "")
    .replace(/\s+(?:with|and)\s+/gi, ",")
    .replace(/;|\n/g, ",");
  if (!normalized || NON_FOOD.test(normalized)) return [];

  return normalized
    .split(",")
    .map((part) => parsePart(part.trim()))
    .filter((item): item is ParsedTextFoodItem => item !== null);
}

function parsePart(part: string): ParsedTextFoodItem | null {
  if (!part || !/[\p{L}\p{N}]/u.test(part)) return null;
  const match = part.match(/^(?:(\d+(?:\.\d+)?)|([a-z]+))?\s*([a-z]+)?\s*(.*)$/i);
  if (!match) return null;
  const quantity = match[1] ? Number(match[1]) : (NUMBER_WORDS[match[2]?.toLowerCase() ?? ""] ?? 1);
  const possibleUnit = match[3]?.toLowerCase() ?? "";
  const unit = UNITS.get(possibleUnit);
  const name = (unit ? match[4] : [match[3], match[4]].filter(Boolean).join(" "))
    .trim()
    .replace(/^of\s+/i, "");
  if (!name || !Number.isFinite(quantity) || quantity <= 0) return null;
  return { name, quantity, unit: unit ?? inferUnit(name) };
}

function inferUnit(name: string): string {
  return /\b(?:egg|eggs|banana|bananas|apple|apples|burger|burgers)\b/i.test(name)
    ? "piece"
    : "serving";
}
