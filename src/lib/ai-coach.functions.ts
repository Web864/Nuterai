import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { enforceAiRateLimit } from "@/lib/rate-limit.server";
import {
  classifyHealthRisk,
  CRISIS_SAFE_RESPONSE,
  MEDICAL_INPUT_REINFORCEMENT,
  scanReplyForUnsafePatterns,
  UNSAFE_OUTPUT_FALLBACK,
} from "@/lib/health-safety";
import { logAiSafetyEvent } from "@/lib/ai-safety-log.server";
import { fetchWithTimeout, isNetworkOrTimeoutError } from "@/lib/utils";

const NETWORK_ERROR_MESSAGE =
  "Unable to reach the AI coach because your internet connection is unavailable or too slow. Please try again.";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_TIMEOUT_MS = 12_000;
const OPENAI_TIMEOUT_MS = 18_000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_CHARS = 700;
const MAX_SYSTEM_CONTEXT_CHARS = 1_800;
const MAX_REPLY_TOKENS = 450;
const GEMINI_FAILURE_THRESHOLD = 2;
const GEMINI_COOLDOWN_MS = 3 * 60_000;
const GEMINI_INVALID_KEY_COOLDOWN_MS = 10 * 60_000;

type GeminiCircuitState = { failures: number; unavailableUntil: number; reason?: string };
type CoachGlobalState = { requestSeq: number; geminiCircuit: GeminiCircuitState };
const coachGlobal = globalThis as typeof globalThis & { __nutriaiCoach?: CoachGlobalState };
const coachState = (coachGlobal.__nutriaiCoach ??= {
  requestSeq: 0,
  geminiCircuit: { failures: 0, unavailableUntil: 0 },
});

const InputSchema = z.object({
  thread_id: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});

const SYSTEM_PROMPT = `You are NutriAI's personal coach - a warm, evidence-based nutrition and fitness expert.

You have concise context about this user (profile, goals, recent meals, workouts, weight). Use it to give specific, personalized advice.

Style:
- Be concise, actionable, and encouraging. Never lecture.
- Default to 3-8 short paragraphs or bullets.
- Use markdown: short paragraphs, bullet lists, bold for key numbers.
- When giving nutrition or workout advice, tie back to THIS user's goals and recent data.
- If asked for a meal or workout, give a concrete plan (foods, macros, sets/reps).
- If user asks about medical conditions, medications, or eating disorders, recommend a licensed professional.
- Never make up data you don't have. If context is missing, ask a quick clarifying question.`;

async function buildUserContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const started = performance.now();
  const [goalsRes, mealsRes, workoutsRes, weightRes] = await Promise.all([
    supabase
      .from("user_goals")
      .select(
        "fitness_goal, diet_preference, daily_calorie_target, protein_g, carbs_g, fat_g, fiber_g, water_target_ml, tdee_kcal, target_weight_kg, sex, age, height_cm, activity_level",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("meal_entries")
      .select("name, calories_kcal, protein_g, carbs_g, fat_g, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(3),
    supabase
      .from("workout_sessions")
      .select("name, duration_minutes, calories_kcal, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(2),
    supabase
      .from("weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(2),
  ]);

  if (import.meta.env.DEV) {
    console.info("[timing] ai.coach.supabase_context end", {
      durationMs: Math.round(performance.now() - started),
    });
  }

  const contextErrors = [goalsRes.error, mealsRes.error, workoutsRes.error, weightRes.error].filter(
    Boolean,
  );
  if (contextErrors.length) {
    console.warn("[ai.coach.context_error]", { count: contextErrors.length });
    throw new Error("AI Coach could not load your context. Please try again.");
  }

  const goals = goalsRes.data;
  const meals = mealsRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const weights = weightRes.data ?? [];

  const parts: string[] = ["=== USER CONTEXT ==="];
  if (goals) {
    parts.push(
      `Profile: sex:${goals.sex ?? "?"}; age:${goals.age ?? "?"}; height:${goals.height_cm ?? "?"}cm; activity:${goals.activity_level ?? "?"}`,
      `Goal: ${goals.fitness_goal ?? "?"}; diet:${goals.diet_preference ?? "?"}; target weight:${goals.target_weight_kg ?? "?"}kg`,
      `Daily targets: ${goals.daily_calorie_target ?? "?"} kcal; P:${goals.protein_g ?? "?"}g; C:${goals.carbs_g ?? "?"}g; F:${goals.fat_g ?? "?"}g; Fiber:${goals.fiber_g ?? "?"}g; Water:${goals.water_target_ml ?? "?"}ml; TDEE:${goals.tdee_kcal ?? "?"} kcal`,
    );
  }
  if (weights.length) {
    parts.push(
      `Recent weight (kg): ${weights.map((w) => `${w.weight_kg}@${w.logged_at?.slice(0, 10)}`).join(", ")}`,
    );
  }
  if (meals.length) {
    parts.push(
      `Recent meals: ${meals
        .map(
          (m) =>
            `${m.name} (${Math.round(m.calories_kcal ?? 0)}kcal, P${Math.round(m.protein_g ?? 0)}/C${Math.round(m.carbs_g ?? 0)}/F${Math.round(m.fat_g ?? 0)})`,
        )
        .join("; ")}`,
    );
  }
  if (workouts.length) {
    parts.push(
      `Recent workouts: ${workouts.map((w) => `${w.name} (${w.duration_minutes ?? 0}min, ${w.calories_kcal ?? 0}kcal)`).join("; ")}`,
    );
  }
  parts.push("=== END CONTEXT ===");
  return truncateForPrompt(parts.join("\n"), MAX_SYSTEM_CONTEXT_CHARS);
}

export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const requestId = ++coachState.requestSeq;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openAiApiKey = process.env.OPENAI_API_KEY;
    console.info("[ai.coach.config]", {
      request: requestId,
      geminiKeyPresent: Boolean(geminiApiKey),
      openAiKeyPresent: Boolean(openAiApiKey),
      geminiModel: GEMINI_MODEL,
      openAiModel: OPENAI_MODEL,
      geminiCircuitOpen: isGeminiCircuitOpen(),
    });

    if (!geminiApiKey && !openAiApiKey) {
      throw new Error("AI Coach is temporarily unavailable. Please try again shortly.");
    }

    const { supabase, userId } = context;
    const requestStarted = performance.now();
    let supabaseContextDurationMs = 0;
    if (import.meta.env.DEV)
      console.info("[timing] ai.coach.request start", { request: requestId });

    try {
      await enforceAiRateLimit(supabase, "coach");

      const { data: thread, error: threadErr } = await supabase
        .from("coach_threads")
        .select("id, user_id, title")
        .eq("id", data.thread_id)
        .maybeSingle();
      if (threadErr)
        throw new Error("AI Coach could not load this conversation. Please try again.");
      if (!thread || thread.user_id !== userId)
        throw new Error("Your session expired. Please sign in again.");

      const { data: history, error: historyErr } = await supabase
        .from("coach_messages")
        .select("role, content")
        .eq("thread_id", data.thread_id)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY_MESSAGES);
      if (historyErr)
        throw new Error("AI Coach could not load this conversation. Please try again.");

      const { error: insertUserErr } = await supabase.from("coach_messages").insert({
        thread_id: data.thread_id,
        user_id: userId,
        role: "user",
        content: data.message,
      });
      if (insertUserErr) throw new Error(insertUserErr.message);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const risk = classifyHealthRisk(data.message);

      if (risk.crisis) {
        void logAiSafetyEvent(userId, "coach", "crisis_input");
        const { data: safeMsg, error: insertSafeErr } = await supabaseAdmin
          .from("coach_messages")
          .insert({
            thread_id: data.thread_id,
            user_id: userId,
            role: "assistant",
            content: CRISIS_SAFE_RESPONSE,
            model: "safety-static",
          })
          .select()
          .single();
        if (insertSafeErr) throw new Error(insertSafeErr.message);

        await supabase
          .from("coach_threads")
          .update({
            last_message_preview: CRISIS_SAFE_RESPONSE.slice(0, 140),
            last_message_at: new Date().toISOString(),
          })
          .eq("id", data.thread_id);

        return { message: safeMsg, model: "safety-static" };
      }

      if (risk.medical) void logAiSafetyEvent(userId, "coach", "medical_input");

      const promptStarted = performance.now();
      const contextStarted = performance.now();
      const userContext = await buildUserContext(supabase, userId);
      supabaseContextDurationMs = Math.round(performance.now() - contextStarted);
      const systemContent = risk.medical
        ? `${SYSTEM_PROMPT}\n\n${MEDICAL_INPUT_REINFORCEMENT}\n\n${userContext}`
        : `${SYSTEM_PROMPT}\n\n${userContext}`;

      const messages: CoachMessage[] = [
        { role: "system", content: systemContent },
        ...(history ?? [])
          .slice()
          .reverse()
          .filter((m) => !(m.role === "user" && m.content === data.message))
          .map((m) => ({
            role: m.role,
            content: truncateForPrompt(m.content, MAX_HISTORY_MESSAGE_CHARS),
          })),
        { role: "user", content: truncateForPrompt(data.message, MAX_HISTORY_MESSAGE_CHARS) },
      ];
      if (import.meta.env.DEV) {
        console.info("[timing] ai.coach.prompt_prepared", {
          request: requestId,
          durationMs: Math.round(performance.now() - promptStarted),
          historyMessages: history?.length ?? 0,
          promptChars: estimateMessagesSize(messages),
          estimatedInputTokens: estimateTokens(estimateMessagesSize(messages)),
        });
      }

      const generation = await generateCoachResponse({
        requestId,
        messages,
        geminiApiKey,
        openAiApiKey,
        supabaseContextDurationMs,
        requestStarted,
      });
      let reply = generation.reply;

      if (scanReplyForUnsafePatterns(reply)) {
        void logAiSafetyEvent(userId, "coach", "unsafe_output");
        reply = UNSAFE_OUTPUT_FALLBACK;
      }

      const { data: assistantMsg, error: insertAiErr } = await supabaseAdmin
        .from("coach_messages")
        .insert({
          thread_id: data.thread_id,
          user_id: userId,
          role: "assistant",
          content: reply,
          model: generation.model,
          tokens_in: generation.tokensIn,
          tokens_out: generation.tokensOut,
        })
        .select()
        .single();
      if (insertAiErr) throw new Error(insertAiErr.message);

      const preview = reply.slice(0, 140);
      const patch: { last_message_preview: string; last_message_at: string; title?: string } = {
        last_message_preview: preview,
        last_message_at: new Date().toISOString(),
      };
      if ((!thread.title || thread.title === "New conversation") && !history?.length) {
        patch.title = data.message.slice(0, 60);
      }
      await supabase.from("coach_threads").update(patch).eq("id", data.thread_id);

      return { message: assistantMsg, model: generation.model };
    } finally {
      if (import.meta.env.DEV) {
        console.info("[timing] ai.coach.request end", {
          request: requestId,
          durationMs: Math.round(performance.now() - requestStarted),
        });
      }
    }
  });

type CoachMessage = { role: string; content: string };
type ProviderName = "gemini" | "openai";

type CoachGeneration = {
  reply: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

class CoachProviderError extends Error {
  constructor(
    message: string,
    readonly transient: boolean,
    readonly status?: number,
    readonly code?: string | number,
  ) {
    super(message);
  }
}

async function generateCoachResponse({
  requestId,
  messages,
  geminiApiKey,
  openAiApiKey,
  supabaseContextDurationMs,
  requestStarted,
}: {
  requestId: number;
  messages: CoachMessage[];
  geminiApiKey?: string;
  openAiApiKey?: string;
  supabaseContextDurationMs: number;
  requestStarted: number;
}): Promise<CoachGeneration> {
  const promptChars = estimateMessagesSize(messages);
  const promptMessages = messages.length;
  let failure: unknown;

  if (geminiApiKey && !isGeminiCircuitOpen()) {
    try {
      const generation = await generateFromProvider({
        requestId,
        provider: "gemini",
        model: GEMINI_MODEL,
        apiKey: geminiApiKey,
        messages,
        timeoutMs: GEMINI_TIMEOUT_MS,
        fallbackUsed: false,
        attempt: 1,
        promptChars,
        promptMessages,
        supabaseContextDurationMs,
        requestStarted,
      });
      resetGeminiCircuit();
      return generation;
    } catch (err) {
      failure = err;
      if (shouldShortCircuitGemini(err)) recordGeminiFailure(err);
      if (!openAiApiKey || (!isFallbackEligible(err) && !isTransientProviderFailure(err)))
        throw err;
    }
  } else if (!geminiApiKey) {
    failure = new CoachProviderError("Gemini is not configured.", true, undefined, "missing_key");
  } else {
    failure = new CoachProviderError("Gemini is in cooldown.", true, undefined, "circuit_open");
  }

  if (!openAiApiKey) {
    if (failure instanceof CoachProviderError) throw new Error(providerUserMessage(failure));
    throw new Error("AI Coach is temporarily unavailable. Please try again shortly.");
  }

  try {
    return await generateFromProvider({
      requestId,
      provider: "openai",
      model: OPENAI_MODEL,
      apiKey: openAiApiKey,
      messages,
      timeoutMs: OPENAI_TIMEOUT_MS,
      fallbackUsed: true,
      attempt: 1,
      promptChars,
      promptMessages,
      supabaseContextDurationMs,
      requestStarted,
    });
  } catch (err) {
    throw new Error(providerUserMessage(toCoachProviderError(err)));
  }
}

async function generateFromProvider({
  requestId,
  provider,
  model,
  apiKey,
  messages,
  timeoutMs,
  fallbackUsed,
  attempt,
  promptChars,
  promptMessages,
  supabaseContextDurationMs,
  requestStarted,
}: {
  requestId: number;
  provider: ProviderName;
  model: string;
  apiKey: string;
  messages: CoachMessage[];
  timeoutMs: number;
  fallbackUsed: boolean;
  attempt: number;
  promptChars: number;
  promptMessages: number;
  supabaseContextDurationMs: number;
  requestStarted: number;
}): Promise<CoachGeneration> {
  const started = performance.now();
  const url = provider === "gemini" ? GEMINI_URL : OPENAI_URL;
  if (import.meta.env.DEV) {
    console.info("[timing] ai.coach.provider_start", {
      request: requestId,
      provider,
      model,
      promptMessages,
      promptChars,
      estimatedInputTokens: estimateTokens(promptChars),
      fallbackUsed,
      attempt,
    });
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: MAX_REPLY_TOKENS,
          temperature: 0.5,
        }),
      },
      { timeoutMs, label: `ai.coach.${provider}.${attempt}` },
    );
    if (!response.ok) {
      const code = await readProviderError(response);
      throw new CoachProviderError(
        providerStatusMessage(response.status),
        isTransientStatus(response.status) || response.status === 401 || response.status === 403,
        response.status,
        code,
      );
    }

    let payload: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new CoachProviderError(
        "The AI Coach returned an invalid response. Please try again.",
        false,
      );
    }
    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new CoachProviderError(
        "The AI Coach returned an invalid response. Please try again.",
        false,
      );
    }

    if (import.meta.env.DEV) {
      console.info("[timing] ai.coach.provider_end", {
        request: requestId,
        provider,
        model,
        promptMessages,
        promptChars,
        estimatedInputTokens: estimateTokens(promptChars),
        supabaseContextDurationMs,
        providerDurationMs: Math.round(performance.now() - started),
        retryCount: attempt - 1,
        status: response.status,
        code: undefined,
        totalDurationMs: Math.round(performance.now() - requestStarted),
        fallbackUsed,
      });
    }
    return {
      reply,
      model,
      tokensIn: payload.usage?.prompt_tokens ?? null,
      tokensOut: payload.usage?.completion_tokens ?? null,
    };
  } catch (err) {
    const failure = toCoachProviderError(err);
    if (import.meta.env.DEV) {
      console.info("[timing] ai.coach.provider_failed", {
        request: requestId,
        provider,
        model,
        promptMessages,
        promptChars,
        estimatedInputTokens: estimateTokens(promptChars),
        supabaseContextDurationMs,
        providerDurationMs: Math.round(performance.now() - started),
        retryCount: attempt - 1,
        status: failure.status,
        code: failure.code,
        totalDurationMs: Math.round(performance.now() - requestStarted),
        fallbackUsed,
      });
    }
    throw failure;
  }
}

function truncateForPrompt(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}...`;
}

function estimateMessagesSize(messages: CoachMessage[]): number {
  return messages.reduce(
    (total, message) => total + message.role.length + message.content.length,
    0,
  );
}

function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function isGeminiCircuitOpen(now = Date.now()): boolean {
  return coachState.geminiCircuit.unavailableUntil > now;
}

function resetGeminiCircuit(): void {
  coachState.geminiCircuit = { failures: 0, unavailableUntil: 0 };
}

function recordGeminiFailure(err: unknown): void {
  const failure = toCoachProviderError(err);
  const failures = coachState.geminiCircuit.failures + 1;
  const invalidConfig = failure.status === 401 || failure.status === 403;
  const shouldOpen = invalidConfig || failures >= GEMINI_FAILURE_THRESHOLD;
  coachState.geminiCircuit = {
    failures,
    unavailableUntil: shouldOpen
      ? Date.now() + (invalidConfig ? GEMINI_INVALID_KEY_COOLDOWN_MS : GEMINI_COOLDOWN_MS)
      : 0,
    reason: String(failure.code ?? failure.status ?? "transient"),
  };
}

function shouldShortCircuitGemini(err: unknown): boolean {
  if (!(err instanceof CoachProviderError)) return false;
  return err.transient || err.status === 401 || err.status === 403;
}

function isFallbackEligible(err: unknown): boolean {
  if (!(err instanceof CoachProviderError)) return false;
  return (
    err.status === 401 ||
    err.status === 403 ||
    err.code === "missing_key" ||
    err.code === "circuit_open"
  );
}

function providerUserMessage(error: CoachProviderError): string {
  if (error.status === 408 || error.code === "timeout") {
    return "The AI Coach took too long to respond. Please try again.";
  }
  if (error.status === 429) {
    return "The AI Coach is busy right now. Please try again in a moment.";
  }
  if (error.code === "auth") {
    return "Your session expired. Please sign in again.";
  }
  return "AI Coach is temporarily unavailable. Please try again shortly.";
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isTransientProviderFailure(err: unknown): boolean {
  return err instanceof CoachProviderError && err.transient;
}

function toCoachProviderError(err: unknown): CoachProviderError {
  if (err instanceof CoachProviderError) return err;
  if (isTimeoutError(err)) {
    return new CoachProviderError(
      "The AI Coach took too long to respond. Please try again.",
      true,
      408,
      "timeout",
    );
  }
  if (isNetworkOrTimeoutError(err)) {
    return new CoachProviderError(NETWORK_ERROR_MESSAGE, true, undefined, "network");
  }
  return new CoachProviderError("AI Coach is temporarily unavailable. Please try again.", false);
}

function providerStatusMessage(status: number): string {
  if (status === 429) return "The AI Coach is busy right now. Please try again in a moment.";
  if (status === 401 || status === 403)
    return "AI Coach is temporarily unavailable. Please try again shortly.";
  if (status >= 500) return "AI Coach is temporarily unavailable. Please try again shortly.";
  return "The AI Coach couldn't process this request. Please try again.";
}

async function readProviderError(response: Response): Promise<string | number | undefined> {
  const text = await response.text().catch(() => "");
  try {
    const payload = JSON.parse(text) as { error?: { code?: string | number; status?: string } };
    return payload.error?.code ?? payload.error?.status;
  } catch {
    return undefined;
  }
}
