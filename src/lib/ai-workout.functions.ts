import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "google/gemini-2.5-flash";

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
  gym_access: z.enum(["full_gym", "home_gym", "basic_equipment", "no_equipment"]).default("no_equipment"),
  experience: z.enum(["none", "beginner", "intermediate", "advanced"]).default("beginner"),
  days_per_week: z.number().int().min(1).max(7).default(3),
  minutes_per_session: z.number().int().min(15).max(180).default(45),
  focus_notes: z.string().max(400).optional(),
});

const SYSTEM_PROMPT = `You are NutriAI's expert strength & conditioning coach. Design a safe, effective, personalized workout plan.

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

export const generateWorkoutPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured. Please contact support.");

    const userPrompt = `Generate a workout plan.

Goal: ${data.goal}
Experience: ${data.experience}
Equipment / gym access: ${data.gym_access}
Days per week: ${data.days_per_week}
Target session length: ${data.minutes_per_session} minutes
${data.focus_notes ? `Preferences: ${data.focus_notes}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "record_workout_plan" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to your workspace.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[generateWorkoutPlan] gateway error", res.status, text);
      throw new Error("Couldn't reach the AI service. Please try again.");
    }

    const payload = (await res.json()) as {
      choices?: Array<{
        message?: {
          tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
        };
      }>;
    };

    const raw = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) throw new Error("The AI didn't return a usable plan. Try rephrasing.");

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      throw new Error("The AI returned malformed data. Try again.");
    }

    const plan = PlanSchema.parse(parsedJson);

    // Persist plan + days
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
        ai_model: MODEL,
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

    return { plan_id: planRow.id, name: planRow.name, model: MODEL };
  });
