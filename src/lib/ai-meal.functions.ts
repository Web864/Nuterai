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
const GEMINI_MAX_ATTEMPTS = 2;
const GEMINI_RETRY_BASE_MS = 250;
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
  return {
    ...AnalyzedResponseSchema.parse(JSON.parse(raw)),
    model: OPENAI_MODEL,
    requestId: getProviderRequestId(response),
  };
}

const MEAL_ANALYSIS_ERROR = "Nutrition analysis is temporarily unavailable. Please try again.";

class MealProviderError extends Error {
  constructor(
    readonly errorType: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(errorType);
  }
}

type MealGenerationInput = {
  description: string;
  geminiApiKey: string;
  openAiApiKey?: string;
  sleep?: (delayMs: number) => Promise<void>;
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 504);
}

function getProviderRequestId(response: Response): string | undefined {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("x-goog-request-id") ??
    response.headers.get("request-id") ??
    undefined
  );
}

function retryDelayMs(attempt: number): number {
  const exponential = GEMINI_RETRY_BASE_MS * 2 ** (attempt - 1);
  return exponential + Math.floor(Math.random() * 100);
}

async function parseGeminiMealResponse(
  response: Response,
  model: string,
): Promise<AnalyzedMeal & { model: string }> {
  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!raw) throw new MealProviderError("GEMINI_INVALID_RESPONSE");

  try {
    const parsed = AnalyzedResponseSchema.parse(JSON.parse(raw));
    if (parsed.items.length === 0) {
      throw new Error("I couldn't identify that as food. Please enter a food or meal name.");
    }
    return { ...parsed, model };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "I couldn't identify that as food. Please enter a food or meal name."
    ) {
      throw error;
    }
    throw new MealProviderError("GEMINI_INVALID_RESPONSE");
  }
}

export async function analyzeMealWithProviders(
  input: MealGenerationInput,
): Promise<AnalyzedMeal & { model: string }> {
  const model = process.env.GEMINI_MODEL ?? MODEL;
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent";
  const started = performance.now();
  const sleep =
    input.sleep ??
    ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  let primaryFailure: MealProviderError | undefined;

  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    const attemptStarted = performance.now();
    console.info("[ai.meal.provider]", {
      provider: "gemini",
      model,
      attempt,
      fallbackUsed: false,
      event: "start",
    });

    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "x-goog-api-key": input.geminiApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [
              { role: "user", parts: [{ text: "Food description: " + input.description }] },
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

      if (response.ok) {
        const result = await parseGeminiMealResponse(response, model);
        console.info("[ai.meal.result]", {
          provider: "gemini",
          model,
          attempt,
          status: response.status,
          requestId: getProviderRequestId(response),
          durationMs: Math.round(performance.now() - attemptStarted),
          totalDurationMs: Math.round(performance.now() - started),
          fallbackUsed: false,
        });
        return result;
      }

      const errorType =
        response.status === 401 || response.status === 403
          ? "GEMINI_AUTH_ERROR"
          : response.status === 429
            ? "GEMINI_RATE_LIMIT"
            : response.status >= 500
              ? "GEMINI_SERVER_ERROR"
              : "GEMINI_REQUEST_ERROR";
      primaryFailure = new MealProviderError(
        errorType,
        response.status,
        isRetryableStatus(response.status),
      );
      console.warn("[ai.meal.result]", {
        provider: "gemini",
        model,
        attempt,
        status: response.status,
        requestId: getProviderRequestId(response),
        errorType,
        durationMs: Math.round(performance.now() - attemptStarted),
        totalDurationMs: Math.round(performance.now() - started),
        fallbackUsed: false,
      });
    } catch (error) {
      if (
        error instanceof MealProviderError ||
        (error instanceof Error && error.message.startsWith("I couldn't identify"))
      ) {
        throw error;
      }
      primaryFailure = new MealProviderError(
        isNetworkOrTimeoutError(error) ? "GEMINI_TIMEOUT_OR_NETWORK" : "GEMINI_REQUEST_ERROR",
        undefined,
        isNetworkOrTimeoutError(error),
      );
      console.warn("[ai.meal.result]", {
        provider: "gemini",
        model,
        attempt,
        errorType: primaryFailure.errorType,
        durationMs: Math.round(performance.now() - attemptStarted),
        totalDurationMs: Math.round(performance.now() - started),
        fallbackUsed: false,
      });
    }

    if (!primaryFailure.retryable) break;
    if (attempt < GEMINI_MAX_ATTEMPTS) await sleep(retryDelayMs(attempt));
  }

  if (primaryFailure?.retryable && input.openAiApiKey) {
    const fallbackStarted = performance.now();
    try {
      console.info("[ai.meal.provider]", {
        provider: "openai",
        model: OPENAI_MODEL,
        attempt: 1,
        fallbackUsed: true,
        event: "start",
      });
      const result = await requestOpenAiMeal(input.openAiApiKey, input.description);
      console.info("[ai.meal.result]", {
        provider: "openai",
        model: OPENAI_MODEL,
        attempt: 1,
        requestId: result.requestId,
        durationMs: Math.round(performance.now() - fallbackStarted),
        totalDurationMs: Math.round(performance.now() - started),
        fallbackUsed: true,
      });
      return result;
    } catch {
      console.warn("[ai.meal.result]", {
        provider: "openai",
        model: OPENAI_MODEL,
        attempt: 1,
        errorType: "OPENAI_FALLBACK_FAILED",
        durationMs: Math.round(performance.now() - fallbackStarted),
        totalDurationMs: Math.round(performance.now() - started),
        fallbackUsed: true,
      });
    }
  }

  throw new Error(MEAL_ANALYSIS_ERROR);
}

export const analyzeMeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error(MEAL_ANALYSIS_ERROR);

    await enforceAiRateLimit(context.supabase, "meal_text");
    if (classifyHealthRisk(data.description).crisis) {
      void logAiSafetyEvent(context.userId, "meal_text", "crisis_input");
      throw new Error(CRISIS_SAFE_RESPONSE);
    }

    return analyzeMealWithProviders({
      description: data.description,
      geminiApiKey,
      openAiApiKey: process.env.OPENAI_API_KEY,
    });
  });
