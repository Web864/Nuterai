import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VISION_MODEL = "gemini-flash-latest";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const AnalyzedItemSchema = z.object({
  name: z.string(),
  serving_qty: z.number().positive().default(1),
  serving_unit: z.string().default("serving"),
  calories_kcal: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fiber_g: z.number().min(0).default(0),
  sugar_g: z.number().min(0).optional(),
  ingredients: z.array(z.string()).optional(),
});

const AnalyzedResponseSchema = z.object({
  items: z.array(AnalyzedItemSchema).min(1),
  confidence: z.number().min(0).max(1).default(0.6),
  notes: z.string().optional(),
});

export type AnalyzedMealPhoto = z.infer<typeof AnalyzedResponseSchema>;

const PhotoInput = z.object({
  image_data_url: z.string().startsWith("data:image/").max(8_000_000),
  hint: z.string().max(200).optional(),
});

const SYSTEM_PROMPT = `You are NutriAI's food-photo analyzer. Given a photo of food, identify EACH distinct food item visible and estimate realistic nutrition for the portion shown.

Rules:
- Identify every distinct food item you see (e.g. "grilled chicken", "rice", "broccoli" -> 3 items).
- Estimate portion size from visual cues (plate size, utensils, common serving sizes).
- Values are per the estimated serving shown in the photo (NOT per 100g).
- Round calories to nearest 5, macros to 1 decimal.
- Set confidence 0-1 based on image clarity and how identifiable the food is.
- List key visible ingredients per item.
- If the image is not food, return items:[] and low confidence with notes explaining.`;

const PHOTO_TOOL = {
  type: "function" as const,
  function: {
    name: "record_photo_estimate",
    description: "Record the estimated nutrition breakdown for the food visible in the photo.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              serving_qty: { type: "number" },
              serving_unit: { type: "string" },
              calories_kcal: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              fiber_g: { type: "number" },
              sugar_g: { type: "number" },
              ingredients: { type: "array", items: { type: "string" } },
            },
            required: [
              "name",
              "serving_qty",
              "serving_unit",
              "calories_kcal",
              "protein_g",
              "carbs_g",
              "fat_g",
              "fiber_g",
            ],
          },
        },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        notes: { type: "string" },
      },
      required: ["items", "confidence"],
    },
  },
};

export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PhotoInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI is not configured. Please contact support.");

    const userText = data.hint
      ? `Analyze this food photo. Additional hint from user: ${data.hint}`
      : "Analyze this food photo and estimate nutrition for every visible item.";

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: data.image_data_url } },
            ],
          },
        ],
        tools: [PHOTO_TOOL],
        tool_choice: { type: "function", function: { name: "record_photo_estimate" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[analyzeMealPhoto] gateway error", res.status, text);
      throw new Error("Couldn't reach the AI service. Please try again.");
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    const raw = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) throw new Error("The AI didn't return a usable answer. Try a clearer photo.");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error("The AI returned malformed data. Try again.");
    }
    const parsed = AnalyzedResponseSchema.parse(parsedJson);
    return { ...parsed, model: VISION_MODEL };
  });

// ---------------- Barcode lookup via Open Food Facts ----------------

const BarcodeInput = z.object({
  barcode: z
    .string()
    .trim()
    .regex(/^\d{6,14}$/, "Invalid barcode"),
});

export type BarcodeProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  serving_size: string | null;
  serving_qty: number;
  serving_unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number | null;
  sodium_mg: number | null;
  ingredients: string | null;
  source: "openfoodfacts";
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BarcodeInput.parse(input))
  .handler(async ({ data }): Promise<BarcodeProduct | null> => {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data.barcode)}.json?fields=product_name,brands,image_front_url,image_url,serving_size,serving_quantity,nutriments,ingredients_text`;
    const res = await fetch(url, {
      headers: { "User-Agent": "NutriAI/1.0 (support@nutriai.app)" },
    });
    if (!res.ok) {
      console.error("[lookupBarcode] off error", res.status);
      throw new Error("Barcode service unavailable. Try again shortly.");
    }
    const body = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        image_front_url?: string;
        image_url?: string;
        serving_size?: string;
        serving_quantity?: number | string;
        nutriments?: Record<string, unknown>;
        ingredients_text?: string;
      };
    };
    if (body.status !== 1 || !body.product) return null;
    const p = body.product;
    const n = p.nutriments ?? {};
    const servingQty = num(p.serving_quantity) || 100;
    const perServing = p.serving_size && n["energy-kcal_serving"] != null;
    const cal = perServing ? num(n["energy-kcal_serving"]) : num(n["energy-kcal_100g"]);
    const protein = perServing ? num(n["proteins_serving"]) : num(n["proteins_100g"]);
    const carbs = perServing ? num(n["carbohydrates_serving"]) : num(n["carbohydrates_100g"]);
    const fat = perServing ? num(n["fat_serving"]) : num(n["fat_100g"]);
    const fiber = perServing ? num(n["fiber_serving"]) : num(n["fiber_100g"]);
    const sugar = perServing ? numOrNull(n["sugars_serving"]) : numOrNull(n["sugars_100g"]);
    const sodium = perServing ? numOrNull(n["sodium_serving"]) : numOrNull(n["sodium_100g"]);

    return {
      barcode: data.barcode,
      name: (p.product_name ?? "").trim() || "Unknown product",
      brand: p.brands?.split(",")[0]?.trim() || null,
      image_url: p.image_front_url ?? p.image_url ?? null,
      serving_size: p.serving_size ?? null,
      serving_qty: perServing ? 1 : servingQty,
      serving_unit: perServing ? (p.serving_size ?? "serving") : "g",
      calories_kcal: Math.round(cal),
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      fiber_g: Math.round(fiber * 10) / 10,
      sugar_g: sugar != null ? Math.round(sugar * 10) / 10 : null,
      sodium_mg: sodium != null ? Math.round(sodium * 1000) : null,
      ingredients: p.ingredients_text?.trim() || null,
      source: "openfoodfacts",
    };
  });

// ---------------- Text search fallback via Open Food Facts ----------------

const SearchInput = z.object({
  query: z.string().trim().min(2).max(80),
});

export type SearchProduct = {
  barcode: string | null;
  name: string;
  brand: string | null;
  image_url: string | null;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_qty: number;
  serving_unit: string;
};

export const searchFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }): Promise<SearchProduct[]> => {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(data.query)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,image_front_small_url,nutriments,serving_quantity`;
    const res = await fetch(url, { headers: { "User-Agent": "NutriAI/1.0" } });
    if (!res.ok) throw new Error("Search unavailable. Try again shortly.");
    const body = (await res.json()) as {
      products?: Array<{
        code?: string;
        product_name?: string;
        brands?: string;
        image_front_small_url?: string;
        serving_quantity?: number | string;
        nutriments?: Record<string, unknown>;
      }>;
    };
    return (body.products ?? [])
      .filter(
        (p) =>
          p.product_name &&
          p.nutriments &&
          (p.nutriments["energy-kcal_100g"] != null || p.nutriments["energy-kcal_serving"] != null),
      )
      .slice(0, 12)
      .map((p) => {
        const n = p.nutriments ?? {};
        const perServing = n["energy-kcal_serving"] != null;
        const servingQty = num(p.serving_quantity) || 100;
        return {
          barcode: p.code ?? null,
          name: (p.product_name ?? "").trim(),
          brand: p.brands?.split(",")[0]?.trim() || null,
          image_url: p.image_front_small_url ?? null,
          calories_kcal: Math.round(
            perServing ? num(n["energy-kcal_serving"]) : num(n["energy-kcal_100g"]),
          ),
          protein_g:
            Math.round((perServing ? num(n["proteins_serving"]) : num(n["proteins_100g"])) * 10) /
            10,
          carbs_g:
            Math.round(
              (perServing ? num(n["carbohydrates_serving"]) : num(n["carbohydrates_100g"])) * 10,
            ) / 10,
          fat_g: Math.round((perServing ? num(n["fat_serving"]) : num(n["fat_100g"])) * 10) / 10,
          fiber_g:
            Math.round((perServing ? num(n["fiber_serving"]) : num(n["fiber_100g"])) * 10) / 10,
          serving_qty: perServing ? 1 : servingQty,
          serving_unit: perServing ? "serving" : "g",
        };
      });
  });
