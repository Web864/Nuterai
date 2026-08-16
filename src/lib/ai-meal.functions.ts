import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchWithTimeout, isNetworkOrTimeoutError } from "@/lib/utils";

const NETWORK_ERROR_MESSAGE =
  "Unable to analyze because your internet connection is unavailable or too slow. Please try again.";

const MODEL = "gemini-flash-latest";
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
});

const AnalyzedResponseSchema = z.object({
  items: z.array(AnalyzedItemSchema).min(1),
  confidence: z.number().min(0).max(1).default(0.7),
  notes: z.string().optional(),
});

export type AnalyzedMeal = z.infer<typeof AnalyzedResponseSchema>;

const InputSchema = z.object({
  description: z.string().trim().min(2).max(500),
});

const SYSTEM_PROMPT = `You are NutriAI's food-nutrition estimator. Given a user's free-text description of what they ate, return a structured JSON breakdown of each food item with realistic nutrition values.

Rules:
- Break the description into distinct food items (e.g. "chicken salad with olive oil and a coffee" -> 3 items).
- Estimate a reasonable single-serving quantity for each item based on typical portion sizes.
- Values are per the serving_qty and serving_unit you output (NOT per 100g).
- Be conservative and realistic. Round calories to nearest 5, macros to 1 decimal.
- Set confidence 0-1 based on how specific the description was.
- Return ONLY the JSON object, no prose, no markdown fences.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "record_meal_estimate",
    description: "Record the estimated nutrition breakdown for the described meal.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        items: {
          type: "array",
          minItems: 1,
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

export const analyzeMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("AI is not configured. Please contact support.");
    }

    let res: Response;
    try {
      res = await fetchWithTimeout(
        GEMINI_URL,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Food description: ${data.description}` },
            ],
            tools: [TOOL],
            tool_choice: { type: "function", function: { name: "record_meal_estimate" } },
          }),
        },
        20000,
      );
    } catch (err) {
      if (isNetworkOrTimeoutError(err)) throw new Error(NETWORK_ERROR_MESSAGE);
      throw err;
    }

    if (res.status === 429) {
      throw new Error("Rate limit reached. Please try again in a moment.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[analyzeMeal] gateway error", res.status, text);
      throw new Error("Couldn't reach the AI service. Please try again.");
    }

    const payload = (await res.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
          content?: string;
        };
      }>;
    };

    const call = payload.choices?.[0]?.message?.tool_calls?.[0];
    const raw = call?.function?.arguments;
    if (!raw) {
      throw new Error("The AI didn't return a usable answer. Try rephrasing.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error("The AI returned malformed data. Try again.");
    }

    const parsed = AnalyzedResponseSchema.parse(parsedJson);
    return { ...parsed, model: MODEL };
  });
