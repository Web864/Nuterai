/**
 * Smart Reminder System domain layer.
 * Pure utilities used by manual reminders, auto diet reminders, hydration,
 * AI Coach actions, notification scheduling, and dashboard previews.
 */

import type { Json, Tables } from "@/integrations/supabase/types";

export type ReminderType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "water"
  | "workout"
  | "walking"
  | "stretching"
  | "cardio"
  | "strength_training"
  | "yoga"
  | "recovery"
  | "custom_exercise"
  | "screen_break"
  | "supplement"
  | "weigh-in"
  | "sleep"
  | "custom"
  | "ai-created"
  | "meal"
  | "weight"
  | "medication";

export type ReminderSource = "manual" | "diet_plan" | "water_plan" | "workout_plan" | "ai_coach" | "system";
export type ReminderCreator = "user" | "system" | "ai_coach";
export type RecurrenceFrequency = "once" | "daily" | "weekdays" | "weekends" | "specific_days" | "custom";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  days?: number[];
  intervalMinutes?: number;
  intervalDays?: number;
  until?: string | null;
  label?: string;
};

export type ReminderRow = Tables<"reminders"> & {
  enabled?: boolean;
  scheduled_time?: string | null;
  recurrence_rule?: Json;
  source?: ReminderSource;
  source_id?: string | null;
  created_by?: ReminderCreator;
  linked_plan_item_id?: string | null;
  snoozed_until?: string | null;
  last_triggered_at?: string | null;
  next_trigger_at?: string | null;
};

export type ReminderDraft = {
  title: string;
  message?: string | null;
  type: ReminderType;
  scheduled_time: string;
  timezone: string;
  recurrence_rule: RecurrenceRule;
  enabled?: boolean;
  source: ReminderSource;
  source_id?: string | null;
  linked_plan_item_id?: string | null;
  created_by: ReminderCreator;
  metadata?: Record<string, unknown>;
};

export const SNOOZE_OPTIONS = [5, 10, 30, 60] as const;
export const DEFAULT_MEAL_TIMES: Record<"breakfast" | "lunch" | "dinner" | "snack", string> = {
  breakfast: "08:00",
  lunch: "13:30",
  dinner: "20:00",
  snack: "16:30",
};

export const REMINDER_TYPES: Array<{ value: ReminderType; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "water", label: "Water" },
  { value: "workout", label: "Workout" },
  { value: "walking", label: "Walking" },
  { value: "stretching", label: "Stretching" },
  { value: "cardio", label: "Cardio" },
  { value: "strength_training", label: "Strength training" },
  { value: "yoga", label: "Yoga" },
  { value: "recovery", label: "Recovery" },
  { value: "custom_exercise", label: "Custom exercise" },
  { value: "supplement", label: "Supplement" },
  { value: "weigh-in", label: "Weigh-in" },
  { value: "sleep", label: "Sleep" },
  { value: "custom", label: "Custom" },
];

const COPY: Record<string, string[]> = {
  water: [
    "Quick hydration check. A glass of water now keeps your day on track.",
    "Small reset: take a few calm sips and keep moving steadily.",
    "Hydration moment. Your future self will appreciate this one.",
  ],
  breakfast: [
    "Good morning. Your breakfast plan is ready when you are.",
    "Breakfast time. Start steady with the meal you planned.",
  ],
  lunch: [
    "Lunch time. Fuel your body with the meal you planned.",
    "Midday check-in. A balanced lunch helps carry the afternoon.",
  ],
  dinner: [
    "Dinner reminder. Stay consistent with your evening plan.",
    "Evening fuel. Keep it simple, balanced, and kind to tomorrow.",
  ],
  snack: [
    "Snack window. Choose something that supports your plan.",
    "A planned snack can keep energy steady.",
  ],
  workout: [
    "Workout time. Your session is ready. A little progress today still counts.",
    "Your workout is ready. Stay consistent and complete today's session.",
    "Training check-in. Show up at the level today allows.",
  ],
  walking: [
    "Time to move. A short walk can make a big difference.",
    "Walking reminder. Step outside or pace it out gently.",
  ],
  stretching: [
    "Stretch break. Give your body a few minutes to reset.",
    "Mobility moment. A few calm stretches can change the whole day.",
  ],
  cardio: [
    "Cardio time. Keep it steady and listen to your body.",
    "Heart-rate session ready. Start at a pace you can sustain.",
  ],
  strength_training: [
    "Strength session ready. Focus on clean reps and steady effort.",
    "Lifting time. Build today with control and consistency.",
  ],
  yoga: [
    "Yoga time. Create a little room to breathe and move.",
    "Flow reminder. Meet your body where it is today.",
  ],
  recovery: [
    "Recovery check-in. Easy movement and rest both count.",
    "Recovery time. Let your body absorb the work you have done.",
  ],
  custom_exercise: [
    "Movement reminder. A focused few minutes still counts.",
  ],
  screen_break: [
    "Screen break. Time to look away for 20 seconds.",
    "Quick visual reset. Focus on something in the distance for a moment.",
    "20-second break. Give your eyes a short screen pause.",
    "Small break, fresh focus. Look away from the screen for 20 seconds.",
  ],
  sleep: [
    "Wind-down time. Give tomorrow a calmer start.",
    "Sleep prep. A gentle routine helps your recovery do its work.",
  ],
  supplement: [
    "Supplement reminder. Take only what you already planned.",
  ],
  "weigh-in": ["Weigh-in reminder. Capture the trend, not the mood of the day."],
  custom: ["Reminder time. One small follow-through keeps momentum alive."],
  "ai-created": ["Coach reminder. This is the nudge you asked NutriAI to keep for you."],
};

export function parseHHMM(t: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return { h, m: mm };
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function partsInTz(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value])) as Record<string, string>;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
    weekday: wdMap[parts.weekday] ?? 0,
  };
}

function zonedTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  let guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  for (let i = 0; i < 3; i++) {
    const p = partsInTz(guess, tz);
    const diffMin =
      (p.year - y) * 525600 + (p.month - mo) * 43800 + (p.day - d) * 1440 + (p.hour - h) * 60 + (p.minute - mi);
    if (diffMin === 0) break;
    guess = new Date(guess.getTime() - diffMin * 60_000);
  }
  return guess;
}

export function normalizeType(type: string | null | undefined): ReminderType {
  if (type === "weight") return "weigh-in";
  if (type === "medication") return "supplement";
  if (type === "meal") return "custom";
  return (type || "custom") as ReminderType;
}

export function normalizeRule(input: unknown, fallbackDays?: number[], recurring = true): RecurrenceRule {
  if (!recurring) return { frequency: "once" };
  const candidate = input && typeof input === "object" ? (input as Partial<RecurrenceRule>) : null;
  if (candidate?.frequency) return candidate as RecurrenceRule;
  const days = fallbackDays?.length ? fallbackDays : [0, 1, 2, 3, 4, 5, 6];
  if (days.length === 5 && days.every((d, i) => d === i + 1)) return { frequency: "weekdays" };
  if (days.length === 2 && days[0] === 0 && days[1] === 6) return { frequency: "weekends" };
  if (days.length === 7) return { frequency: "daily" };
  return { frequency: "specific_days", days };
}

export function ruleToDays(rule: RecurrenceRule): number[] {
  if (rule.frequency === "weekdays") return [1, 2, 3, 4, 5];
  if (rule.frequency === "weekends") return [0, 6];
  if (rule.frequency === "specific_days" || rule.frequency === "custom") return sanitizeDays(rule.days ?? [0, 1, 2, 3, 4, 5, 6]);
  return [0, 1, 2, 3, 4, 5, 6];
}

export function recurrenceLabel(rule: RecurrenceRule): string {
  if (rule.frequency === "once") return "Once";
  if (rule.frequency === "daily") return "Daily";
  if (rule.frequency === "weekdays") return "Weekdays";
  if (rule.frequency === "weekends") return "Weekends";
  if (rule.intervalMinutes) return `Every ${rule.intervalMinutes} min`;
  if (rule.label) return rule.label;
  return ruleToDays(rule).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ");
}

export function nextOccurrence(r: ReminderRow, from: Date = new Date()): Date | null {
  const enabled = r.enabled ?? r.is_active;
  if (!enabled) return null;

  const snoozed = r.snoozed_until ?? r.snooze_until;
  if (snoozed) {
    const snz = new Date(snoozed);
    if (snz > from) return snz;
  }

  const rule = normalizeRule(r.recurrence_rule, r.days_of_week, r.is_recurring);
  if (rule.frequency === "once") {
    const value = r.one_time_at ?? r.next_trigger_at;
    if (!value) return null;
    const t = new Date(value);
    return t > from ? t : null;
  }

  if (rule.intervalMinutes && r.last_triggered_at) {
    const next = new Date(new Date(r.last_triggered_at).getTime() + rule.intervalMinutes * 60_000);
    if (next > from) return next;
  }

  const tz = r.timezone || "UTC";
  const times = (r.scheduled_time ? [r.scheduled_time] : r.times).map(parseHHMM).filter((x): x is { h: number; m: number } => !!x);
  if (times.length === 0) return null;
  const days = ruleToDays(rule);

  for (let offset = 0; offset < 370; offset++) {
    const base = new Date(from.getTime() + offset * 86_400_000);
    const p = partsInTz(base, tz);
    if (!days.includes(p.weekday)) continue;
    for (const t of [...times].sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))) {
      const cand = zonedTimeToUtc(p.year, p.month, p.day, t.h, t.m, tz);
      if (cand > from) return cand;
    }
  }
  return null;
}

export function inQuietHours(date: Date, tz: string, start: string | null | undefined, end: string | null | undefined): boolean {
  if (!start || !end) return false;
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (!s || !e) return false;
  const p = partsInTz(date, tz);
  const cur = p.hour * 60 + p.minute;
  const sm = s.h * 60 + s.m;
  const em = e.h * 60 + e.m;
  if (sm === em) return false;
  if (sm < em) return cur >= sm && cur < em;
  return cur >= sm || cur < em;
}

export function typeLabel(t: string): string {
  return REMINDER_TYPES.find((item) => item.value === normalizeType(t))?.label ?? "Reminder";
}

export function sourceLabel(source?: string | null): string {
  return (
    {
      manual: "Manual",
      diet_plan: "Diet plan",
      water_plan: "Hydration",
      ai_coach: "AI Coach",
      system: "System",
    }[source ?? "manual"] ?? "Manual"
  );
}

export function notificationCopy(type: string, title: string, seed = 0): string {
  const normalized = normalizeType(type);
  const options = COPY[normalized] ?? COPY.custom;
  return options[Math.abs(seed) % options.length] ?? title;
}

export function toInsertPayload(draft: ReminderDraft) {
  const recurrence = draft.recurrence_rule;
  const recurring = recurrence.frequency !== "once";
  return {
    title: draft.title.trim(),
    message: draft.message?.trim() || notificationCopy(draft.type, draft.title),
    type: legacyCompatibleType(draft.type) as never,
    scheduled_time: draft.scheduled_time,
    timezone: draft.timezone,
    recurrence_rule: recurrence as never,
    enabled: draft.enabled ?? true,
    is_active: draft.enabled ?? true,
    is_recurring: recurring,
    times: recurring ? [draft.scheduled_time] : [],
    days_of_week: ruleToDays(recurrence),
    one_time_at: recurring ? null : wallTimeTodayOrFuture(draft.scheduled_time, draft.timezone).toISOString(),
    source: draft.source as never,
    source_id: draft.source_id ?? null,
    linked_plan_item_id: draft.linked_plan_item_id ?? null,
    created_by: draft.created_by as never,
    metadata: (draft.metadata ?? {}) as never,
    snoozed_until: null,
    snooze_until: null,
    next_trigger_at: null,
  };
}

export function buildDietReminderDrafts(timezone: string, mealTimes?: Partial<Record<"breakfast" | "lunch" | "dinner" | "snack", string>>): ReminderDraft[] {
  return (["breakfast", "lunch", "dinner"] as const).map((meal) => ({
    title: `${typeLabel(meal)} reminder`,
    message: notificationCopy(meal, meal),
    type: meal,
    scheduled_time: mealTimes?.[meal] ?? DEFAULT_MEAL_TIMES[meal],
    timezone,
    recurrence_rule: { frequency: "daily" },
    enabled: true,
    source: "diet_plan",
    source_id: `diet-plan:${meal}`,
    linked_plan_item_id: meal,
    created_by: "system",
    metadata: { stable_key: `diet-plan:${meal}` },
  }));
}

export function buildHydrationReminderDrafts(options: {
  timezone: string;
  targetMl: number;
  wakeTime: string;
  sleepTime: string;
  intervalMinutes: number;
}): ReminderDraft[] {
  const wake = parseHHMM(options.wakeTime) ?? { h: 8, m: 0 };
  const sleep = parseHHMM(options.sleepTime) ?? { h: 22, m: 0 };
  const start = wake.h * 60 + wake.m;
  const end = sleep.h * 60 + sleep.m;
  const active = Math.max(60, end > start ? end - start : 24 * 60 - start + end);
  const interval = Math.max(30, options.intervalMinutes || 120);
  const count = Math.max(1, Math.floor(active / interval));
  const amount = Math.max(150, Math.round(options.targetMl / count));
  const drafts: ReminderDraft[] = [];
  for (let i = 0; i < count; i++) {
    const minuteOfDay = (start + i * interval) % (24 * 60);
    const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`;
    drafts.push({
      title: "Hydration check",
      message: `${notificationCopy("water", "Hydration check", i)} Aim for about ${amount} ml now.`,
      type: "water",
      scheduled_time: time,
      timezone: options.timezone,
      recurrence_rule: { frequency: "daily", intervalMinutes: interval },
      enabled: true,
      source: "water_plan",
      source_id: `water-plan:${time}`,
      linked_plan_item_id: "water-target",
      created_by: "system",
      metadata: { target_ml: options.targetMl, suggested_amount_ml: amount, wake_time: options.wakeTime, sleep_time: options.sleepTime },
    });
  }
  return drafts;
}

export type WorkoutPlanReminderDay = {
  id: string;
  plan_id: string;
  day_index: number;
  title: string;
  focus?: string | null;
  estimated_minutes?: number | null;
  scheduled_time?: string | null;
};

const WORKOUT_FOCUS_TYPE: Record<string, ReminderType> = {
  cardio: "cardio",
  mobility: "stretching",
  core: "strength_training",
  upper: "strength_training",
  lower: "strength_training",
  push: "strength_training",
  pull: "strength_training",
  legs: "strength_training",
  full_body: "workout",
  hiit: "cardio",
  rest: "recovery",
  custom: "custom_exercise",
};

export function buildWorkoutPlanReminderDrafts(options: {
  timezone: string;
  planId: string;
  planName?: string | null;
  planActive?: boolean;
  days: WorkoutPlanReminderDay[];
  defaultTime?: string;
}): ReminderDraft[] {
  const defaultTime = options.defaultTime ?? "19:00";
  return options.days.map((day, index) => {
    const type = WORKOUT_FOCUS_TYPE[day.focus ?? ""] ?? "workout";
    const scheduledTime = day.scheduled_time ?? defaultTime;
    const dayOfWeek = dayIndexToWeekday(day.day_index);
    return {
      title: day.title || `${typeLabel(type)} workout`,
      message: notificationCopy(type, day.title, index),
      type,
      scheduled_time: scheduledTime,
      timezone: options.timezone,
      recurrence_rule: { frequency: "specific_days", days: [dayOfWeek], label: DAYS_LABELS[dayOfWeek] },
      enabled: options.planActive !== false,
      source: "workout_plan",
      source_id: `workout-plan:${options.planId}:${day.id}`,
      linked_plan_item_id: day.id,
      created_by: "system",
      metadata: {
        plan_id: options.planId,
        plan_name: options.planName ?? null,
        workout_focus: day.focus ?? null,
        estimated_minutes: day.estimated_minutes ?? null,
        deep_link: `/workout?planDayId=${day.id}`,
      },
    } satisfies ReminderDraft;
  });
}

const DAYS_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayIndexToWeekday(dayIndex: number): number {
  if (dayIndex <= 0) return 1;
  return ((dayIndex - 1) % 7) + 1 > 6 ? 0 : ((dayIndex - 1) % 7) + 1;
}
export function formatWhen(d: Date): string {
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `in ${diffMin} min`;
  if (diffMin < 60 * 24) return `in ${Math.round(diffMin / 60)} h`;
  return d.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export function wallTimeTodayOrFuture(time: string, timezone: string, from = new Date()): Date {
  const parsed = parseHHMM(time) ?? { h: 9, m: 0 };
  for (let offset = 0; offset < 2; offset++) {
    const p = partsInTz(new Date(from.getTime() + offset * 86_400_000), timezone);
    const cand = zonedTimeToUtc(p.year, p.month, p.day, parsed.h, parsed.m, timezone);
    if (cand > from) return cand;
  }
  return new Date(from.getTime() + 86_400_000);
}

export function sanitizeDays(days: number[]): number[] {
  return [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
}

function legacyCompatibleType(type: ReminderType): ReminderType {
  if (type === "weigh-in") return "weight";
  if (type === "supplement") return "medication";
  if (type === "ai-created") return "custom";
  return type;
}





