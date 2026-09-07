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

const MODEL = "gemini-flash-latest";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const COACH_TIMEOUT_MS = 40_000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_MESSAGE_CHARS = 1_200;

const InputSchema = z.object({
  thread_id: z.string().uuid(),
  message: z.string().trim().min(1).max(4000),
});

const SYSTEM_PROMPT = `You are NutriAI's personal coach — a warm, evidence-based nutrition and fitness expert.

You have full context about this user (profile, goals, recent meals, workouts, weight). Use it to give specific, personalized advice.

Style:
- Be concise, actionable, and encouraging. Never lecture.
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
      .limit(3),
    supabase
      .from("weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(3),
  ]);

  if (import.meta.env.DEV) {
    console.info("[timing] ai.coach.supabase_context end", {
      durationMs: Math.round(performance.now() - started),
    });
  }
  const goals = goalsRes.data;
  const meals = mealsRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const weights = weightRes.data ?? [];

  // Deliberately no full_name/identity field here (data-minimization pass,
  // Phase 1 Part 7): the system prompt never instructs the model to address
  // the user by name, so sending it added no functional value for the
  // privacy cost of an unnecessary direct identifier in every request.
  const parts: string[] = ["=== USER CONTEXT ==="];
  if (goals) {
    parts.push(
      `Profile: sex:${goals.sex ?? "?"} · age:${goals.age ?? "?"} · height:${goals.height_cm ?? "?"}cm · activity:${goals.activity_level ?? "?"}`,
    );
  }
  if (goals) {
    parts.push(
      `Goal: ${goals.fitness_goal ?? "?"} · diet:${goals.diet_preference ?? "?"} · target weight:${goals.target_weight_kg ?? "?"}kg`,
    );
    parts.push(
      `Daily targets: ${goals.daily_calorie_target ?? "?"} kcal · P:${goals.protein_g ?? "?"}g · C:${goals.carbs_g ?? "?"}g · F:${goals.fat_g ?? "?"}g · Fiber:${goals.fiber_g ?? "?"}g · Water:${goals.water_target_ml ?? "?"}ml · TDEE:${goals.tdee_kcal ?? "?"} kcal`,
    );
  }
  if (weights.length) {
    parts.push(
      `Recent weight (kg): ${weights.map((w: { weight_kg: number | null; logged_at: string | null }) => `${w.weight_kg}@${w.logged_at?.slice(0, 10)}`).join(", ")}`,
    );
  }
  if (meals.length) {
    parts.push(
      `Recent meals: ${meals
        .slice(0, 5)
        .map(
          (m: {
            name: string;
            calories_kcal: number | null;
            protein_g: number | null;
            carbs_g: number | null;
            fat_g: number | null;
          }) =>
            `${m.name} (${Math.round(m.calories_kcal ?? 0)}kcal, P${Math.round(m.protein_g ?? 0)}/C${Math.round(m.carbs_g ?? 0)}/F${Math.round(m.fat_g ?? 0)})`,
        )
        .join("; ")}`,
    );
  }
  if (workouts.length) {
    parts.push(
      `Recent workouts: ${workouts.map((w: { name: string; duration_minutes: number | null; calories_kcal: number | null }) => `${w.name} (${w.duration_minutes ?? 0}min, ${w.calories_kcal ?? 0}kcal)`).join("; ")}`,
    );
  }
  parts.push("=== END CONTEXT ===");
  return parts.join("\n");
}

export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    console.info("[ai.coach.config]", {
      "GEMINI_API_KEY present": Boolean(process.env.GEMINI_API_KEY),
      "OPENAI_API_KEY present": Boolean(process.env.OPENAI_API_KEY),
    });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("AI is not configured. Please contact support.");

    const { supabase, userId } = context;
    const requestStarted = performance.now();
    if (import.meta.env.DEV) console.info("[timing] ai.coach.request start");

    try {
      await enforceAiRateLimit(supabase, "coach");

      // Verify thread ownership
      const { data: thread, error: threadErr } = await supabase
        .from("coach_threads")
        .select("id, user_id, title")
        .eq("id", data.thread_id)
        .maybeSingle();
      if (threadErr || !thread || thread.user_id !== userId) {
        throw new Error("Thread not found.");
      }

      // Keep the latest useful conversation context bounded so it cannot make
      // otherwise simple Coach requests slow or exceed the provider's limits.
      const { data: history } = await supabase
        .from("coach_messages")
        .select("role, content")
        .eq("thread_id", data.thread_id)
        .order("created_at", { ascending: false })
        .limit(MAX_HISTORY_MESSAGES);

      // Persist the user message
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
            model: MODEL,
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

        return { message: safeMsg, model: MODEL };
      }

      if (risk.medical) void logAiSafetyEvent(userId, "coach", "medical_input");

      const promptStarted = performance.now();
      // Build user context
      const userContext = await buildUserContext(supabase, userId);
      const systemContent = risk.medical
        ? `${SYSTEM_PROMPT}\n\n${MEDICAL_INPUT_REINFORCEMENT}\n\n${userContext}`
        : `${SYSTEM_PROMPT}\n\n${userContext}`;

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemContent },
        ...(history ?? [])
          .slice()
          .reverse()
          .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_MESSAGE_CHARS) })),
        { role: "user", content: data.message },
      ];
      if (import.meta.env.DEV) {
        console.info("[timing] ai.coach.prompt_prepared", {
          durationMs: Math.round(performance.now() - promptStarted),
          historyMessages: history?.length ?? 0,
          promptChars: messages.reduce((total, message) => total + message.content.length, 0),
        });
      }

      const generation = await generateCoachResponse(messages, apiKey);
      let reply = generation.reply;

      if (scanReplyForUnsafePatterns(reply)) {
        void logAiSafetyEvent(userId, "coach", "unsafe_output");
        reply = UNSAFE_OUTPUT_FALLBACK;
      }

      // Persist assistant message via the service-role client: RLS restricts
      // client-authenticated inserts to role = 'user' so a browser can't forge
      // assistant/system turns and inject instructions into the AI prompt.
      const { data: assistantMsg, error: insertAiErr } = await supabaseAdmin
        .from("coach_messages")
        .insert({
          thread_id: data.thread_id,
          user_id: userId,
          role: "assistant",
          content: reply,
          model: MODEL,
          tokens_in: payload.usage?.prompt_tokens ?? null,
          tokens_out: payload.usage?.completion_tokens ?? null,
        })
        .select()
        .single();
      if (insertAiErr) throw new Error(insertAiErr.message);

      // Update thread preview + auto-title first message
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

async function generateCoachResponse(
  messages: CoachMessage[],
  geminiApiKey: string,
): Promise<CoachGeneration> {
  let failure: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await generateFromProvider({
        provider: "gemini",
        model: MODEL,
        apiKey: geminiApiKey,
        messages,
        timeoutMs: GEMINI_TIMEOUT_MS,
        fallbackUsed: false,
        attempt,
      });
    } catch (err) {
      failure = err;
      if (!isTransientProviderFailure(err) || attempt === 2) break;
    }
  }

  if (!isTransientProviderFailure(failure)) throw failure;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) throw new Error("AI Coach is temporarily unavailable. Please try again.");

  try {
    return await generateFromProvider({
      provider: "openai",
      model: OPENAI_MODEL,
      apiKey: openAiApiKey,
      messages,
      timeoutMs: OPENAI_TIMEOUT_MS,
      fallbackUsed: true,
      attempt: 1,
    });
  } catch {
    throw new Error("AI Coach is temporarily unavailable. Please try again.");
  }
}

async function generateFromProvider({
  provider,
  model,
  apiKey,
  messages,
  timeoutMs,
  fallbackUsed,
  attempt,
}: {
  provider: ProviderName;
  model: string;
  apiKey: string;
  messages: CoachMessage[];
  timeoutMs: number;
  fallbackUsed: boolean;
  attempt: number;
}): Promise<CoachGeneration> {
  const started = performance.now();
  const url = provider === "gemini" ? GEMINI_URL : OPENAI_URL;
  if (import.meta.env.DEV) {
    console.info("[timing] ai.coach.provider_start", { provider, model, fallbackUsed, attempt });
  }

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages }),
      },
      { timeoutMs, label: `ai.coach.${provider}.${attempt}` },
    );
    if (!response.ok) {
      const code = await readProviderError(response);
      throw new CoachProviderError(
        providerStatusMessage(response.status),
        isTransientStatus(response.status),
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
    if (!reply)
      throw new CoachProviderError(
        "The AI Coach returned an invalid response. Please try again.",
        false,
      );

    if (import.meta.env.DEV) {
      console.info("[timing] ai.coach.provider_end", {
        provider,
        model,
        status: response.status,
        durationMs: Math.round(performance.now() - started),
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
        provider,
        model,
        status: failure.status,
        code: failure.code,
        durationMs: Math.round(performance.now() - started),
        fallbackUsed,
      });
    }
    throw failure;
  }
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
  if (status === 429) return "The AI Coach is busy. Please wait a moment and try again.";
  if (status === 401 || status === 403)
    return "The AI Coach configuration needs attention. Please contact support.";
  if (status >= 500) return "The AI provider is temporarily unavailable. Please try again shortly.";
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
