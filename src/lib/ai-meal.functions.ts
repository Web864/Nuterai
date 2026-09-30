import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchWithTimeout, isNetworkOrTimeoutError } from "@/lib/utils";
import { enforceAiRateLimit } from "@/lib/rate-limit.server";
import {
  AI_WELLNESS_SAFETY_POLICY,
  classifyHealthRisk,
  CRISIS_SAFE_RESPONSE,
} from "@/lib/health-safety";
import { logAiSafetyEvent } from "@/lib/ai-safety-log.server";

const NETWORK_ERROR_MESSAGE =
  "Unable to analyze because your internet connection is unavailable or too slow. Please try again.";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
// const MODEL = "gemini-flash-latest";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const GEMINI_TIMEOUT_MS = 28_000;
const LONGCAT_MODEL = process.env.LONGCAT_MODEL ?? "LongCat-2.0";
const LONGCAT_URL =
  (process.env.LONGCAT_BASE_URL ?? "https://api.longcat.chat/openai/v1").replace(/\/+$/, "") +
  "/chat/completions";

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
  items: z.array(AnalyzedItemSchema),
  confidence: z.number().min(0).max(1).default(0.7),
  notes: z.string().optional(),
});

export type AnalyzedMeal = z.infer<typeof AnalyzedResponseSchema>;

const InputSchema = z.object({
  description: z.string().trim().min(2).max(500),
});

const SYSTEM_PROMPT = `${AI_WELLNESS_SAFETY_POLICY}

You are NutriAI's food-nutrition estimator. Given a user's free-text description of what they ate, return a structured JSON breakdown of each food item with realistic nutrition values.

Rules:
- Break the description into distinct food items (e.g. "chicken salad with olive oil and a coffee" -> 3 items).
- Estimate a reasonable single-serving quantity for each item based on typical portion sizes.
- Values are per the serving_qty and serving_unit you output (NOT per 100g).
- Be conservative and realistic. Round calories to nearest 5, macros to 1 decimal.
- Set confidence 0-1 based on how specific the description was.
- If the input is not food or a meal, return an empty items array with a short note.
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

async function requestOpenAiMeal(apiKey: string, description: string) {
  const response = await fetchWithTimeout(
    OPENAI_URL,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Food description: ${description}` },
        ],
        tools: [TOOL],
        tool_choice: "auto",
      }),
    },
    { timeoutMs: 20_000, label: "ai.meal_text.openai" },
  );
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
  };
  const raw = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!raw) throw new Error("OpenAI returned no structured meal estimate.");
  return { ...AnalyzedResponseSchema.parse(JSON.parse(raw)), model: OPENAI_MODEL };
}

export const analyzeMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
      throw new Error("Nutrition analysis is temporarily unavailable. Please try again.");

    await enforceAiRateLimit(context.supabase, "meal_text");
    if (classifyHealthRisk(data.description).crisis) {
      void logAiSafetyEvent(context.userId, "meal_text", "crisis_input");
      throw new Error(CRISIS_SAFE_RESPONSE);
    }

    const started = performance.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    let response: Response;
    try {
      console.info("[ai.meal.provider]", { provider: "gemini", model: MODEL, event: "start" });
      response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              { role: "user", parts: [{ text: `Food description: ${data.description}` }] },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: TOOL.function.parameters,
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingLevel: "low" },
            },
          }),
        },
        { timeoutMs: GEMINI_TIMEOUT_MS, label: "ai.meal_text.gemini" },
      );
    } catch (error) {
      console.warn("[ai.meal.result]", {
        provider: "gemini",
        model: MODEL,
        errorType: isNetworkOrTimeoutError(error) ? "GEMINI_TIMEOUT" : "GEMINI_NETWORK_ERROR",
        durationMs: Math.round(performance.now() - started),
      });
      throw new Error("Nutrition analysis is temporarily unavailable. Please try again.");
    }

    if (!response.ok) {
      const errorType =
        response.status === 401 || response.status === 403
          ? "GEMINI_AUTH_ERROR"
          : response.status === 429
            ? "GEMINI_RATE_LIMIT"
            : response.status >= 500
              ? "GEMINI_SERVER_ERROR"
              : "GEMINI_REQUEST_ERROR";
      console.warn("[ai.meal.result]", {
        provider: "gemini",
        model: MODEL,
        status: response.status,
        errorType,
        durationMs: Math.round(performance.now() - started),
      });
      throw new Error("Nutrition analysis is temporarily unavailable. Please try again.");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!raw) {
      console.warn("[ai.meal.result]", {
        provider: "gemini",
        model: MODEL,
        errorType: "GEMINI_INVALID_RESPONSE",
        durationMs: Math.round(performance.now() - started),
      });
      throw new Error("Nutrition analysis is temporarily unavailable. Please try again.");
    }
    try {
      const parsed = AnalyzedResponseSchema.parse(JSON.parse(raw));
      if (parsed.items.length === 0) {
        throw new Error("I couldn't identify that as food. Please enter a food or meal name.");
      }
      console.info("[ai.meal.result]", {
        provider: "gemini",
        model: MODEL,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        parsing: "success",
      });
      return { ...parsed, model: MODEL };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "I couldn't identify that as food. Please enter a food or meal name."
      ) {
        throw error;
      }
      console.warn("[ai.meal.result]", {
        provider: "gemini",
        model: MODEL,
        errorType: "GEMINI_INVALID_RESPONSE",
        durationMs: Math.round(performance.now() - started),
      });
      throw new Error("Nutrition analysis is temporarily unavailable. Please try again.");
    }
  });
