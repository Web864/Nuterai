import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-2.5-flash";

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
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const [profileRes, goalsRes, mealsRes, workoutsRes, weightRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, sex, age, height_cm, activity_level")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_goals")
      .select(
        "fitness_goal, diet_preference, daily_calorie_target, protein_g, carbs_g, fat_g, fiber_g, water_target_ml, tdee_kcal, target_weight_kg",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("meal_entries")
      .select("name, calories_kcal, protein_g, carbs_g, fat_g, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(10),
    supabase
      .from("workout_sessions")
      .select("name, duration_seconds, calories_burned, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(5),
    supabase
      .from("weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(5),
  ]);

  const profile = profileRes.data;
  const goals = goalsRes.data;
  const meals = mealsRes.data ?? [];
  const workouts = workoutsRes.data ?? [];
  const weights = weightRes.data ?? [];

  const parts: string[] = ["=== USER CONTEXT ==="];
  if (profile) {
    parts.push(
      `Profile: ${profile.full_name ?? "user"} · sex:${profile.sex ?? "?"} · age:${profile.age ?? "?"} · height:${profile.height_cm ?? "?"}cm · activity:${profile.activity_level ?? "?"}`,
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
      `Recent workouts: ${workouts.map((w: { name: string; duration_seconds: number | null; calories_burned: number | null }) => `${w.name} (${Math.round((w.duration_seconds ?? 0) / 60)}min, ${w.calories_burned ?? 0}kcal)`).join("; ")}`,
    );
  }
  parts.push("=== END CONTEXT ===");
  return parts.join("\n");
}

// Stub type import to avoid circular issues
type SupabaseLike = { from: (t: string) => any };
function createClient(): SupabaseLike {
  return { from: () => ({}) };
}

export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured. Please contact support.");

    const { supabase, userId } = context;

    // Verify thread ownership
    const { data: thread, error: threadErr } = await supabase
      .from("coach_threads")
      .select("id, user_id, title")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (threadErr || !thread || thread.user_id !== userId) {
      throw new Error("Thread not found.");
    }

    // Fetch prior messages (last 20 for context)
    const { data: history } = await supabase
      .from("coach_messages")
      .select("role, content")
      .eq("thread_id", data.thread_id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Persist the user message
    const { error: insertUserErr } = await supabase.from("coach_messages").insert({
      thread_id: data.thread_id,
      user_id: userId,
      role: "user",
      content: data.message,
    });
    if (insertUserErr) throw new Error(insertUserErr.message);

    // Build user context
    const userContext = await buildUserContext(supabase as never, userId);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\n${userContext}` },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits to your workspace.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sendCoachMessage] gateway error", res.status, text);
      throw new Error("Couldn't reach the AI service. Please try again.");
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("The AI didn't return a response. Please try again.");

    // Persist assistant message
    const { data: assistantMsg, error: insertAiErr } = await supabase
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

    return { message: assistantMsg, model: MODEL };
  });
