import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildDietReminderDrafts, buildHydrationReminderDrafts, buildWorkoutPlanReminderDrafts, detectTimezone, toInsertPayload, type ReminderDraft, type ReminderType } from "@/lib/reminders";
import { SCREEN_BREAK_FEATURE_DISABLED_MESSAGE } from "@/features/screen-break/screen-break.config";
import { parseScreenBreakCoachCommand } from "@/features/screen-break/screen-break.actions";

const ActionSchema = z.object({
  action: z.enum(["create_reminder", "update_reminder", "delete_reminder", "enable_reminder", "disable_reminder", "snooze_reminder", "list_reminders", "create_plan_reminders", "create_workout_plan_reminders"]),
  reminder_id: z.string().uuid().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  time: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  repeat: z.enum(["once", "daily", "weekdays", "weekends", "specific_days", "custom"]).optional(),
  days: z.array(z.number().int().min(0).max(6)).optional(),
  minutes: z.number().int().min(5).max(1440).optional(),
  interval_minutes: z.number().int().min(30).max(360).optional(),
});

const ProposeSchema = z.object({ message: z.string().trim().min(1).max(1000) });
const ApplySchema = z.object({ action: ActionSchema });

export type ReminderAction = z.infer<typeof ActionSchema>;

export const proposeReminderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProposeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const action = parseReminderCommand(data.message);
    if (!action) return { action: null, confirmation: null, preview: null };
    const confirmation = confirmationFor(action);
    await context.supabase.from("coach_messages").insert({
      thread_id: "00000000-0000-0000-0000-000000000000" as never,
      user_id: context.userId,
      role: "system" as never,
      content: `Proposed reminder action: ${JSON.stringify(action)}`,
    } as never).then(() => undefined, () => undefined);
    return { action, confirmation, preview: actionPreview(action), disabledMessage: null };
  });

export const applyReminderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ApplySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const timezone = detectTimezone();
    const action = data.action;

    if (action.action === "list_reminders") {
      const { data: reminders, error } = await supabase.from("reminders").select("id,title,type,scheduled_time,times,enabled,is_active,source").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      if (error) throw new Error(error.message);
      return { status: "listed", reminders: reminders ?? [] };
    }

    if (action.action === "create_workout_plan_reminders") {
      const { data: plan, error: planError } = await supabase.from("workout_plans").select("id,name,is_active").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (planError) throw new Error(planError.message);
      if (!plan) throw new Error("No active workout plan found.");
      const { data: days, error: daysError } = await supabase.from("workout_plan_days").select("id,plan_id,day_index,title,focus,estimated_minutes").eq("plan_id", plan.id).eq("user_id", userId).order("day_index", { ascending: true });
      if (daysError) throw new Error(daysError.message);
      const rows = buildWorkoutPlanReminderDrafts({ timezone, planId: plan.id, planName: plan.name, planActive: plan.is_active, days: days ?? [] }).map((draft) => ({ ...toInsertPayload(draft), user_id: userId }));
      const { error } = await supabase.from("reminders").upsert(rows as never, { onConflict: "user_id,source,source_id" });
      if (error) throw new Error(error.message);
      return { status: "created_workout_plan_reminders" };
    }

    if (action.action === "create_plan_reminders") {
      const rows = buildDietReminderDrafts(timezone).map((draft) => ({ ...toInsertPayload(draft), user_id: userId }));
      const { error } = await supabase.from("reminders").upsert(rows as never, { onConflict: "user_id,source,source_id" });
      if (error) throw new Error(error.message);
      return { status: "created_plan_reminders" };
    }

    if (action.action === "create_reminder") {
      if (action.type === "water" && action.interval_minutes) {
        const rows = buildHydrationReminderDrafts({ timezone, targetMl: 2500, wakeTime: "08:00", sleepTime: "22:00", intervalMinutes: action.interval_minutes }).map((draft) => ({ ...toInsertPayload({ ...draft, created_by: "ai_coach", source: "ai_coach", source_id: `ai:${draft.source_id}` }), user_id: userId }));
        const { error } = await supabase.from("reminders").upsert(rows as never, { onConflict: "user_id,source,source_id" });
        if (error) throw new Error(error.message);
        return { status: "created_hydration_reminders" };
      }
      const draft: ReminderDraft = {
        title: action.title ?? `${labelFor(action.type)} reminder`,
        message: action.message ?? null,
        type: normalizeActionType(action.type),
        scheduled_time: action.time ?? "09:00",
        timezone,
        recurrence_rule: { frequency: action.repeat ?? "daily", days: action.days },
        enabled: true,
        source: "ai_coach",
        source_id: `ai:${normalizeActionType(action.type)}:${action.time ?? "09:00"}:${action.repeat ?? "daily"}`,
        created_by: "ai_coach",
      };
      const { error } = await supabase.from("reminders").upsert({ ...toInsertPayload(draft), user_id: userId } as never, { onConflict: "user_id,source,source_id" });
      if (error) throw new Error(error.message);
      return { status: "created_reminder" };
    }

    if (!action.reminder_id && action.action !== "disable_reminder") throw new Error("Choose a reminder before applying this action.");

    if (action.action === "disable_reminder" && !action.reminder_id) {
      const type = action.type ? normalizeActionType(action.type) : undefined;
      const query = supabase.from("reminders").update({ enabled: false, is_active: false } as never).eq("user_id", userId);
      const { error } = type ? await query.eq("type", type as never) : await query.eq("source", "water_plan" as never);
      if (error) throw new Error(error.message);
      return { status: "disabled_reminders" };
    }

    const patch: Record<string, unknown> = {};
    if (action.action === "enable_reminder") Object.assign(patch, { enabled: true, is_active: true });
    if (action.action === "disable_reminder") Object.assign(patch, { enabled: false, is_active: false });
    if (action.action === "snooze_reminder") {
      const until = new Date(Date.now() + (action.minutes ?? 10) * 60_000).toISOString();
      Object.assign(patch, { snoozed_until: until, snooze_until: until });
    }
    if (action.action === "update_reminder") {
      if (action.time) Object.assign(patch, { scheduled_time: action.time, times: [action.time] });
      if (action.title) Object.assign(patch, { title: action.title });
      if (action.repeat) Object.assign(patch, { recurrence_rule: { frequency: action.repeat, days: action.days } });
    }
    if (action.action === "delete_reminder") {
      const { error } = await supabase.from("reminders").delete().eq("id", action.reminder_id!).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { status: "deleted_reminder" };
    }
    const { error } = await supabase.from("reminders").update(patch as never).eq("id", action.reminder_id!).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { status: "updated_reminder" };
  });

function parseReminderCommand(message: string): ReminderAction | null {
  const text = message.toLowerCase();
  if (!/(remind|reminder|pause|snooze|delete|set|move|add|create).*(water|lunch|breakfast|dinner|snack|workout|exercise|walk|walking|stretch|cardio|strength|gym|yoga|recovery|weigh|sleep|supplement|diet plan|workout plan)|water reminders|diet plan reminders|workout reminders|gym reminders/.test(text)) return null;
  if (/list|show/.test(text)) return { action: "list_reminders" };
  if (/workout plan|exercise plan|gym reminders|workout reminders according|according to my workout/.test(text)) return { action: "create_workout_plan_reminders" };
  if (/diet plan/.test(text)) return { action: "create_plan_reminders" };
  if (/pause|disable/.test(text)) return { action: "disable_reminder", type: inferType(text) };
  if (/delete|remove/.test(text)) return { action: "delete_reminder", type: inferType(text) };
  if (/snooze/.test(text)) return { action: "snooze_reminder", type: inferType(text), minutes: inferMinutes(text) ?? 10 };
  const interval = /every\s+(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min)/.exec(text);
  const time = inferTime(text);
  return {
    action: /set|change|update/.test(text) ? "update_reminder" : "create_reminder",
    type: inferType(text),
    time: time ?? (inferType(text) === "lunch" ? "13:00" : undefined),
    repeat: inferRepeat(text),
    interval_minutes: interval ? Number(interval[1]) * (interval[2].startsWith("hour") || interval[2].startsWith("hr") ? 60 : 1) : undefined,
    title: `${labelFor(inferType(text))} reminder`,
  };
}

function inferType(text: string | undefined): string {
  if (!text) return "custom";
  if (text.includes("breakfast")) return "breakfast";
  if (text.includes("lunch")) return "lunch";
  if (text.includes("dinner")) return "dinner";
  if (text.includes("snack")) return "snack";
  if (text.includes("water") || text.includes("hydrat")) return "water";
  if (text.includes("workout") || text.includes("exercise")) return "workout";
  if (text.includes("weigh")) return "weigh-in";
  if (text.includes("sleep")) return "sleep";
  if (text.includes("supplement")) return "supplement";
  return "custom";
}

function inferTime(text: string): string | undefined {
  const match = /(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/.exec(text);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const suffix = match[3];
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function inferRepeat(text: string): ReminderAction["repeat"] {
  if (text.includes("weekday")) return "weekdays";
  if (text.includes("weekend")) return "weekends";
  if (text.includes("monday")) return "specific_days";
  if (text.includes("once")) return "once";
  return "daily";
}

function inferMinutes(text: string): number | undefined {
  const match = /(\d+)\s*(minute|min|hour|hr)/.exec(text);
  if (!match) return undefined;
  return Number(match[1]) * (match[2].startsWith("hour") || match[2].startsWith("hr") ? 60 : 1);
}

function normalizeActionType(type: string | undefined): ReminderType {
  return (type || "custom") as ReminderType;
}

function labelFor(type: string | undefined): string {
  return (type ?? "custom").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function actionPreview(action: ReminderAction): string {
  if (action.action === "create_workout_plan_reminders") return "Create reminders from your active workout plan days.";
  if (action.action === "create_plan_reminders") return "Create breakfast, lunch, and dinner reminders from your plan.";
  if (action.action === "list_reminders") return "Show your current reminders.";
  if (action.interval_minutes) return `Create ${labelFor(action.type)} reminders every ${action.interval_minutes} minutes.`;
  return `${labelFor(action.action.replace(/_/g, " "))}: ${labelFor(action.type)}${action.time ? ` at ${action.time}` : ""}.`;
}

function confirmationFor(action: ReminderAction): string {
  if (action.action === "create_workout_plan_reminders") return "I can set reminders according to your active workout plan. Shall I create them?";
  if (action.action === "create_plan_reminders") return "I can set reminders according to your diet plan. Shall I create them?";
  if (action.interval_minutes) return `I can remind you to ${action.type === "water" ? "drink water" : labelFor(action.type).toLowerCase()} every ${action.interval_minutes} minutes. Shall I set this up?`;
  if (["delete_reminder", "disable_reminder"].includes(action.action)) return "This changes existing reminders. Shall I apply it?";
  return "I found a reminder action. Shall I apply it?";
}



