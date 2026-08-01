/**
 * Central gamification tracker.
 *
 * Every gamified action in the app funnels through `trackEvent`, which is the
 * single source of truth for: XP awards, streak updates, achievement progress
 * and activity-feed entries. Keeping it in one place means no duplicated
 * reward logic across the nutrition / workout / coach / scanner / reminder
 * features.
 *
 * All writes go through security-definer RPCs that re-scope to `auth.uid()`,
 * so a tampered client cannot award XP to anyone else.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  XP_REWARDS,
  XP_LABELS,
  localDay,
  type StreakKind,
  type XpReason,
} from "@/lib/gamification";
import {
  awardXpRaw,
  ensureStats,
  progressAchievementRaw,
  recordStreakRaw,
  type AwardResult,
  type ProgressResult,
} from "./queries";

export type TrackEvent =
  | { type: "meal_logged"; name?: string }
  | { type: "water_logged"; amountMl?: number }
  | { type: "water_goal_met" }
  | { type: "weight_logged"; weightKg?: number; reachedTarget?: boolean }
  | { type: "workout_logged"; name?: string; minutes?: number; calories?: number; personalBest?: boolean }
  | { type: "workout_plan_created"; name?: string }
  | { type: "coach_message" }
  | { type: "food_scanned"; method?: "photo" | "barcode" | "search" }
  | { type: "reminder_created" }
  | { type: "reminder_completed" }
  | { type: "post_created" }
  | { type: "comment_created" }
  | { type: "friend_added"; friendCount?: number }
  | { type: "daily_login" }
  | { type: "calorie_target_hit" }
  | { type: "likes_received"; total: number };

export type TrackResult = {
  xp: number;
  award: AwardResult | null;
  unlocked: ProgressResult[];
  streak: { kind: StreakKind; streak: number; isNewDay: boolean } | null;
};

type Plan = {
  xp?: XpReason;
  streak?: StreakKind;
  /** [code, value, mode] */
  achievements?: Array<[string, number, "set" | "increment"]>;
  activity?: {
    kind: Tables<"activity_events">["kind"];
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  };
};

/** Achievements keyed off the *resulting* streak value, applied after record_streak. */
const STREAK_ACHIEVEMENTS: Partial<Record<StreakKind, string[]>> = {
  workout: ["workout_streak_7", "workout_streak_30"],
  water: ["water_streak_7"],
  login: ["login_streak_7", "login_streak_30"],
  reminder: ["reminder_streak_7"],
  nutrition: ["protein_week"],
};

function buildPlan(event: TrackEvent): Plan {
  switch (event.type) {
    case "meal_logged":
      return {
        xp: "meal_logged",
        streak: "nutrition",
        achievements: [
          ["first_meal", 1, "set"],
          ["meals_25", 1, "increment"],
          ["meals_100", 1, "increment"],
        ],
        activity: {
          kind: "meal",
          title: event.name ? `Logged ${event.name}` : "Logged a meal",
          metadata: { name: event.name ?? null },
        },
      };
    case "water_logged":
      return {
        xp: "water_logged",
        achievements: [["first_water", 1, "set"]],
      };
    case "water_goal_met":
      return {
        xp: "daily_bonus",
        streak: "water",
        achievements: [["water_goal_day", 1, "set"]],
        activity: { kind: "streak", title: "Hit the daily hydration goal" },
      };
    case "weight_logged":
      return {
        xp: "weight_logged",
        achievements: [
          ["first_weight", 1, "set"],
          ["weight_5", 1, "increment"],
          ...(event.reachedTarget ? ([["weight_goal", 1, "set"]] as Array<[string, number, "set"]>) : []),
        ],
        activity: {
          kind: "weight",
          title: event.weightKg ? `Weighed in at ${event.weightKg} kg` : "Logged a weigh-in",
          metadata: { weight_kg: event.weightKg ?? null },
        },
      };
    case "workout_logged":
      return {
        xp: "workout_logged",
        streak: "workout",
        achievements: [
          ["first_workout", 1, "set"],
          ["workouts_10", 1, "increment"],
          ["workouts_50", 1, "increment"],
          ["workouts_100", 1, "increment"],
          ...(event.personalBest ? ([["personal_best", 1, "set"]] as Array<[string, number, "set"]>) : []),
        ],
        activity: {
          kind: event.personalBest ? "personal_best" : "workout",
          title: event.name ? `Completed ${event.name}` : "Completed a workout",
          description:
            event.minutes || event.calories
              ? [event.minutes ? `${event.minutes} min` : null, event.calories ? `${event.calories} kcal` : null]
                  .filter(Boolean)
                  .join(" · ")
              : undefined,
          metadata: { minutes: event.minutes ?? null, calories: event.calories ?? null },
        },
      };
    case "workout_plan_created":
      return {
        xp: "workout_plan_created",
        activity: { kind: "workout", title: event.name ? `New plan: ${event.name}` : "Created a workout plan" },
      };
    case "coach_message":
      return {
        xp: "coach_message",
        streak: "coach",
        achievements: [
          ["first_coach", 1, "set"],
          ["coach_25", 1, "increment"],
        ],
      };
    case "food_scanned":
      return {
        xp: "food_scanned",
        achievements: [
          ["first_scan", 1, "set"],
          ["scans_20", 1, "increment"],
        ],
      };
    case "reminder_created":
      return { xp: "reminder_created", achievements: [["first_reminder", 1, "set"]] };
    case "reminder_completed":
      return { xp: "reminder_completed", streak: "reminder" };
    case "post_created":
      return { xp: "post_created", achievements: [["first_post", 1, "set"]] };
    case "comment_created":
      return { xp: "comment_created" };
    case "friend_added":
      return {
        xp: "friend_added",
        achievements: [
          ["first_friend", 1, "set"],
          ["friends_10", event.friendCount ?? 1, "set"],
        ],
      };
    case "daily_login":
      return { xp: "daily_login", streak: "login" };
    case "calorie_target_hit":
      return { xp: "daily_bonus", achievements: [["macro_day", 1, "set"]] };
    case "likes_received":
      return { achievements: [["likes_50", event.total, "set"]] };
    default:
      return {};
  }
}

/** Guard against double-awarding the same once-per-day event within a session/tab. */
const dailyOnce = new Set<string>();
function onceToday(key: string): boolean {
  const k = `${key}:${localDay()}`;
  if (dailyOnce.has(k)) return false;
  dailyOnce.add(k);
  return true;
}

const ONCE_PER_DAY: TrackEvent["type"][] = ["daily_login", "water_goal_met", "calorie_target_hit"];

export async function trackEvent(userId: string, event: TrackEvent): Promise<TrackResult> {
  const empty: TrackResult = { xp: 0, award: null, unlocked: [], streak: null };
  if (!userId) return empty;

  if (ONCE_PER_DAY.includes(event.type) && !onceToday(`${userId}:${event.type}`)) return empty;

  const plan = buildPlan(event);
  const unlocked: ProgressResult[] = [];
  let award: AwardResult | null = null;
  let streakInfo: TrackResult["streak"] = null;

  try {
    await ensureStats(userId);

    if (plan.xp) {
      const amount = XP_REWARDS[plan.xp];
      award = await awardXpRaw(userId, amount, XP_LABELS[plan.xp], event.type, { event: event.type });
    }

    if (plan.streak) {
      const s = await recordStreakRaw(userId, plan.streak);
      if (s) {
        streakInfo = { kind: plan.streak, streak: s.streak, isNewDay: s.is_new_day };
        for (const code of STREAK_ACHIEVEMENTS[plan.streak] ?? []) {
          const r = await progressAchievementRaw(userId, code, s.streak, "set");
          if (r?.unlocked) unlocked.push(r);
        }
        // Milestone streak activity entries at 7 / 30 / 100 days.
        if (s.is_new_day && [7, 14, 30, 50, 100].includes(s.streak)) {
          await supabase.from("activity_events").insert({
            user_id: userId,
            kind: "streak",
            title: `${s.streak}-day ${plan.streak} streak`,
            metadata: { kind: plan.streak, streak: s.streak } as never,
          });
        }
      }
    }

    for (const [code, value, mode] of plan.achievements ?? []) {
      const r = await progressAchievementRaw(userId, code, value, mode);
      if (r?.unlocked) unlocked.push(r);
    }

    // Secret achievement: any log between 01:00 and 04:00 local time.
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 4 && event.type !== "likes_received") {
      const r = await progressAchievementRaw(userId, "night_owl", 1, "set");
      if (r?.unlocked) unlocked.push(r);
    }

    if (plan.activity) {
      await supabase.from("activity_events").insert({
        user_id: userId,
        kind: plan.activity.kind,
        title: plan.activity.title,
        description: plan.activity.description ?? null,
        metadata: (plan.activity.metadata ?? {}) as never,
        xp_awarded: award ? XP_REWARDS[plan.xp!] : 0,
      });
    }

    // Level-based achievements after any XP change.
    if (award) {
      if (award.level >= 10) {
        const r = await progressAchievementRaw(userId, "level_10", 1, "set");
        if (r?.unlocked) unlocked.push(r);
      }
      if (award.level >= 25) {
        const r = await progressAchievementRaw(userId, "level_25", 1, "set");
        if (r?.unlocked) unlocked.push(r);
      }
    }
  } catch (err) {
    // Gamification is additive: never break the user's primary action.
    console.error("[gamification] trackEvent failed", event.type, err);
  }

  return {
    xp: plan.xp ? XP_REWARDS[plan.xp] : 0,
    award,
    unlocked,
    streak: streakInfo,
  };
}
