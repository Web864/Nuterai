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

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const LONGCAT_MODEL = process.env.LONGCAT_MODEL ?? "LongCat-2.0";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const LONGCAT_URL =
  (process.env.LONGCAT_BASE_URL ?? "https://api.longcat.chat/openai/v1").replace(/\/+$/, "") +
  "/chat/completions";
const GEMINI_TIMEOUT_MS = 12_000;
const OPENAI_TIMEOUT_MS = 18_000;
const LONGCAT_TIMEOUT_MS = 12_000;
const GEMINI_FAILURE_THRESHOLD = 2;
const GEMINI_COOLDOWN_MS = 3 * 60_000;

// type ProviderName = "gemini" | "openai";
type ProviderName = "longcat" | "gemini" | "openai";
type WorkoutCircuitState = { failures: number; unavailableUntil: number };
type WorkoutGlobalState = { requestSeq: number; geminiCircuit: WorkoutCircuitState };
const workoutGlobal = globalThis as typeof globalThis & { __nutriaiWorkout?: WorkoutGlobalState };
const workoutState = (workoutGlobal.__nutriaiWorkout ??= {
  requestSeq: 0,
  geminiCircuit: { failures: 0, unavailableUntil: 0 },
});

const ExerciseSchema = z.object({
  name: z.string(),
  muscle_group: z.string().default("full body"),
  sets: z.number().int().min(1).max(10),
  reps: z.union([z.number(), z.string()]),
  rest_seconds: z.number().int().min(0).max(600).default(60),
  notes: z.string().optional(),
});

const DaySchema = z.object({
  day_index: z.number().int().min(1).max(7),
  title: z.string(),
  focus: z.enum([
    "full_body",
    "upper",
    "lower",
    "push",
    "pull",
    "legs",
    "core",
    "cardio",
    "hiit",
    "mobility",
    "rest",
    "custom",
  ]),
  estimated_minutes: z.number().int().min(10).max(180).default(45),
  exercises: z.array(ExerciseSchema).default([]),
});

const PlanSchema = z.object({
  name: z.string(),
  goal: z.string(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  days_per_week: z.number().int().min(1).max(7),
  duration_weeks: z.number().int().min(1).max(24).default(4),
  notes: z.string().optional(),
  days: z.array(DaySchema).min(1),
});

export type GeneratedPlan = z.infer<typeof PlanSchema>;

const InputSchema = z.object({
  goal: z.string().min(2).max(200),
  gym_access: z
    .enum(["full_gym", "home_gym", "basic_equipment", "no_equipment"])
    .default("no_equipment"),
  experience: z.enum(["none", "beginner", "intermediate", "advanced"]).default("beginner"),
  days_per_week: z.number().int().min(1).max(7).default(3),
  minutes_per_session: z.number().int().min(15).max(180).default(45),
  focus_notes: z.string().max(400).optional(),
});

const SYSTEM_PROMPT = `${AI_WELLNESS_SAFETY_POLICY}

You are NutriAI's expert strength & conditioning coach. Design a safe, effective, personalized workout plan.

Rules:
- Match difficulty to the user's experience level.
- Only use equipment consistent with their gym access.
- Include a mix of compound and accessory movements.
- For "no_equipment", stick to bodyweight movements.
- Give clear rep ranges (e.g. "8-12" or 15) and appropriate rest.
- Provide days_per_week workout days. Do not include rest days as workout entries.
- Return ONLY the tool call, no prose.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "record_workout_plan",
    description: "Persist a personalized workout plan for the user.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        goal: { type: "string" },
        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        days_per_week: { type: "number" },
        duration_weeks: { type: "number" },
        notes: { type: "string" },
        days: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              day_index: { type: "number" },
              title: { type: "string" },
              focus: {
                type: "string",
                enum: [
                  "full_body",
                  "upper",
                  "lower",
                  "push",
                  "pull",
                  "legs",
                  "core",
                  "cardio",
                  "hiit",
                  "mobility",
                  "rest",
                  "custom",
                ],
              },
              estimated_minutes: { type: "number" },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    name: { type: "string" },
                    muscle_group: { type: "string" },
                    sets: { type: "number" },
                    reps: { type: ["number", "string"] },
                    rest_seconds: { type: "number" },
                    notes: { type: "string" },
                  },
                  required: ["name", "sets", "reps"],
                },
              },
            },
            required: ["day_index", "title", "focus", "estimated_minutes", "exercises"],
          },
        },
      },
      required: ["name", "goal", "difficulty", "days_per_week", "days"],
    },
  },
};

type ProviderGeneration = {
  plan: GeneratedPlan;
  raw: unknown;
  model: string;
  provider: ProviderName;
  fallbackUsed: boolean;
};

class WorkoutProviderError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
    readonly status?: number,
    readonly errorType?: string,
  ) {
    super(message);
  }
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isGeminiCircuitOpen(now = Date.now()): boolean {
  return workoutState.geminiCircuit.unavailableUntil > now;
}

function resetGeminiCircuit(): void {
  workoutState.geminiCircuit = { failures: 0, unavailableUntil: 0 };
}

function recordGeminiFailure(): void {
  const failures = workoutState.geminiCircuit.failures + 1;
  workoutState.geminiCircuit = {
    failures,
    unavailableUntil: failures >= GEMINI_FAILURE_THRESHOLD ? Date.now() + GEMINI_COOLDOWN_MS : 0,
  };
}

function toWorkoutProviderError(err: unknown): WorkoutProviderError {
  if (err instanceof WorkoutProviderError) return err;
  if (isNetworkOrTimeoutError(err)) {
    const timeout =
      err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
    return new WorkoutProviderError(
      timeout ? "Workout generation timed out." : "Workout provider network failure.",
      true,
      undefined,
      timeout ? "timeout" : "network",
    );
  }
  return new WorkoutProviderError("Workout provider request failed.", false, undefined, "unknown");
}

function shouldFallBackFromLongCat(err: unknown): boolean {
  const failure = toWorkoutProviderError(err);
  return (
    failure.transient ||
    failure.status === 401 ||
    failure.status === 403 ||
    failure.errorType === "invalid_json" ||
    failure.errorType === "invalid_response" ||
    failure.errorType === "malformed_plan" ||
    failure.errorType === "invalid_plan"
  );
}

async function generateFromProvider({
  requestId,
  provider,
  apiKey,
  model,
  userPrompt,
  timeoutMs,
  fallbackUsed,
  requestStarted,
}: {
  requestId: number;
  provider: ProviderName;
  apiKey: string;
  model: string;
  userPrompt: string;
  timeoutMs: number;
  fallbackUsed: boolean;
  requestStarted: number;
}): Promise<ProviderGeneration> {
  const started = performance.now();
  let status: number | undefined;
  try {
    const response = await fetchWithTimeout(
      // provider === "gemini" ? GEMINI_URL : OPENAI_URL,
      provider === "longcat" ? LONGCAT_URL : provider === "gemini" ? GEMINI_URL : OPENAI_URL,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          tools: [TOOL],
          tool_choice: { type: "function", function: { name: "record_workout_plan" } },
          ...(provider === "longcat" ? { thinking: { type: "disabled" } } : {}),
        }),
      },
      { timeoutMs, label: `ai.workout.${provider}` },
    );
    status = response.status;
    if (!response.ok) {
      throw new WorkoutProviderError(
        "Workout provider returned an error.",
        isTransientStatus(response.status),
        response.status,
        `http_${response.status}`,
      );
    }
    let payload: {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new WorkoutProviderError(
        "Workout provider returned invalid JSON.",
        false,
        status,
        "invalid_json",
      );
    }
    const raw = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw)
      throw new WorkoutProviderError(
        "Workout provider returned no plan.",
        false,
        status,
        "invalid_response",
      );
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new WorkoutProviderError(
        "Workout provider returned malformed plan data.",
        false,
        status,
        "malformed_plan",
      );
    }
    const plan = PlanSchema.safeParse(parsedJson);
    if (!plan.success)
      throw new WorkoutProviderError(
        "Workout provider returned an invalid plan.",
        false,
        status,
        "invalid_plan",
      );
    console.info("[ai.workout.provider]", {
      requestId,
      provider,
      model,
      status,
      duration: Math.round(performance.now() - started),
      fallbackUsed,
      totalMs: Math.round(performance.now() - requestStarted),
      errorType: undefined,
    });
    return { plan: plan.data, raw: parsedJson, model, provider, fallbackUsed };
  } catch (err) {
    const failure = toWorkoutProviderError(err);
    console.warn("[ai.workout.provider]", {
      requestId,
      provider,
      model,
      status: failure.status ?? status,
      duration: Math.round(performance.now() - started),
      fallbackUsed,
      totalMs: Math.round(performance.now() - requestStarted),
      errorType: failure.errorType,
    });
    throw failure;
  }
}

async function generateWorkoutWithFallback({
  requestId,
  longCatApiKey,
  geminiApiKey,
  openAiApiKey,
  userPrompt,
  requestStarted,
}: {
  requestId: number;
  longCatApiKey?: string;
  geminiApiKey?: string;
  openAiApiKey?: string;
  userPrompt: string;
  requestStarted: number;
}): Promise<ProviderGeneration> {
  if (longCatApiKey) {
    try {
      return await generateFromProvider({
        requestId,
        provider: "longcat",
        apiKey: longCatApiKey,
        model: LONGCAT_MODEL,
        userPrompt,
        timeoutMs: LONGCAT_TIMEOUT_MS,
        fallbackUsed: false,
        requestStarted,
      });
    } catch (err) {
      if (!shouldFallBackFromLongCat(err)) throw toWorkoutProviderError(err);
    }
  }

  let geminiFailure: WorkoutProviderError | undefined;
  if (geminiApiKey && !isGeminiCircuitOpen()) {
    try {
      const generation = await generateFromProvider({
        requestId,
        provider: "gemini",
        apiKey: geminiApiKey,
        model: GEMINI_MODEL,
        userPrompt,
        timeoutMs: GEMINI_TIMEOUT_MS,
        fallbackUsed: false,
        requestStarted,
      });
      resetGeminiCircuit();
      return generation;
    } catch (err) {
      geminiFailure = toWorkoutProviderError(err);
      if (!geminiFailure.transient) throw geminiFailure;
      recordGeminiFailure();
    }
  } else {
    geminiFailure = new WorkoutProviderError(
      geminiApiKey ? "Gemini is in cooldown." : "Gemini is not configured.",
      true,
      undefined,
      geminiApiKey ? "circuit_open" : "missing_key",
    );
  }

  if (openAiApiKey) {
    try {
      return await generateFromProvider({
        requestId,
        provider: "openai",
        apiKey: openAiApiKey,
        model: OPENAI_MODEL,
        userPrompt,
        timeoutMs: OPENAI_TIMEOUT_MS,
        fallbackUsed: true,
        requestStarted,
      });
    } catch {
      // The final result log records a single user-safe combined failure.
    }
  }
  throw geminiFailure;
}
export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const requestId = ++workoutState.requestSeq;
    const requestStarted = performance.now();
    const longCatApiKey = process.env.LONGCAT_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;
    // if (!geminiApiKey && !openAiApiKey) {
    if (!longCatApiKey && !geminiApiKey && !openAiApiKey) {
      throw new Error("Workout generation is temporarily unavailable. Please try again.");
    }

    await enforceAiRateLimit(context.supabase, "workout");
    if (data.focus_notes && classifyHealthRisk(data.focus_notes).crisis) {
      void logAiSafetyEvent(context.userId, "workout", "crisis_input");
      throw new Error(CRISIS_SAFE_RESPONSE);
    }

    const userPrompt = `Generate a workout plan.

Goal: ${data.goal}
Experience: ${data.experience}
Equipment / gym access: ${data.gym_access}
Days per week: ${data.days_per_week}
Target session length: ${data.minutes_per_session} minutes
${data.focus_notes ? `Preferences: ${data.focus_notes}` : ""}`;

    try {
      const generation = await generateWorkoutWithFallback({
        requestId,
        longCatApiKey,
        geminiApiKey,
        openAiApiKey,
        userPrompt,
        requestStarted,
      });
      const { plan, raw: parsedJson, model, provider, fallbackUsed } = generation;
      const { supabase, userId } = context;
      const { data: planRow, error: planErr } = await supabase
        .from("workout_plans")
        .insert({
          user_id: userId,
          name: plan.name,
          goal: plan.goal,
          difficulty: plan.difficulty,
          days_per_week: plan.days_per_week,
          duration_weeks: plan.duration_weeks,
          notes: plan.notes ?? null,
          is_active: false,
          source: "ai",
          ai_model: model,
          ai_raw: parsedJson as never,
        })
        .select()
        .single();
      if (planErr || !planRow) throw new Error(planErr?.message ?? "Failed to save plan.");

      const dayRows = plan.days.map((d) => ({
        plan_id: planRow.id,
        user_id: userId,
        day_index: d.day_index,
        title: d.title,
        focus: d.focus,
        estimated_minutes: d.estimated_minutes,
        exercises: d.exercises as never,
      }));
      const { error: daysErr } = await supabase.from("workout_plan_days").insert(dayRows);
      if (daysErr) {
        console.error("[generateWorkoutPlan] day insert error", daysErr);
        throw new Error("Saved plan but failed to save days.");
      }

      console.info("[ai.workout.result]", {
        requestId,
        provider,
        model,
        status: 200,
        duration: Math.round(performance.now() - requestStarted),
        fallbackUsed,
        totalMs: Math.round(performance.now() - requestStarted),
        errorType: undefined,
      });
      return { plan_id: planRow.id, name: planRow.name, model };
    } catch (err) {
      console.warn("[ai.workout.result]", {
        requestId,
        provider: "openai",
        model: OPENAI_MODEL,
        status: err instanceof WorkoutProviderError ? err.status : undefined,
        duration: Math.round(performance.now() - requestStarted),
        fallbackUsed: Boolean(openAiApiKey),
        totalMs: Math.round(performance.now() - requestStarted),
        errorType: err instanceof WorkoutProviderError ? err.errorType : "persistence",
      });
      if (err instanceof WorkoutProviderError && err.transient) {
        throw new Error("Workout generation is temporarily unavailable. Please try again.");
      }
      throw err;
    }
  });
