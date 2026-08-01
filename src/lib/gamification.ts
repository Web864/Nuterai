/**
 * Gamification pure helpers — XP curve, level math, labels.
 * Mirrors the SQL functions `xp_for_level` / `level_for_xp` exactly so the
 * client can render progress without an extra round-trip.
 */

export type StreakKind = "workout" | "nutrition" | "water" | "login" | "coach" | "reminder";
export type AchievementCategory =
  | "nutrition"
  | "workout"
  | "hydration"
  | "consistency"
  | "community"
  | "milestone";
export type AchievementDifficulty = "bronze" | "silver" | "gold" | "platinum";

/** Cumulative XP required to *reach* a level. Level 1 = 0, 2 = 100, 3 = 300, 4 = 600... */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return (l - 1) * l * 50;
}

/** Inverse of xpForLevel. */
export function levelForXp(xp: number): number {
  const x = Math.max(0, xp);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + x / 12.5)) / 2));
}

export type LevelProgress = {
  level: number;
  xp: number;
  levelFloor: number;
  levelCeil: number;
  intoLevel: number;
  levelSpan: number;
  toNextLevel: number;
  percent: number;
};

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const levelFloor = xpForLevel(level);
  const levelCeil = xpForLevel(level + 1);
  const levelSpan = Math.max(1, levelCeil - levelFloor);
  const intoLevel = Math.max(0, xp - levelFloor);
  return {
    level,
    xp,
    levelFloor,
    levelCeil,
    intoLevel,
    levelSpan,
    toNextLevel: Math.max(0, levelCeil - xp),
    percent: Math.min(100, Math.round((intoLevel / levelSpan) * 100)),
  };
}

/** XP awarded for each tracked action. Kept in one place to avoid drift. */
export const XP_REWARDS = {
  meal_logged: 15,
  water_logged: 5,
  weight_logged: 20,
  workout_logged: 40,
  workout_plan_created: 60,
  coach_message: 10,
  food_scanned: 20,
  reminder_created: 15,
  reminder_completed: 10,
  post_created: 25,
  comment_created: 5,
  friend_added: 30,
  daily_login: 10,
  daily_bonus: 25,
  weekly_bonus: 100,
} as const;

export type XpReason = keyof typeof XP_REWARDS;

export const XP_LABELS: Record<XpReason, string> = {
  meal_logged: "Logged a meal",
  water_logged: "Logged water",
  weight_logged: "Logged weight",
  workout_logged: "Completed a workout",
  workout_plan_created: "Created a workout plan",
  coach_message: "Chatted with the AI coach",
  food_scanned: "Scanned a food",
  reminder_created: "Created a reminder",
  reminder_completed: "Completed a reminder",
  post_created: "Shared a post",
  comment_created: "Commented on a post",
  friend_added: "Made a new friend",
  daily_login: "Daily check-in",
  daily_bonus: "Daily goals bonus",
  weekly_bonus: "Weekly goals bonus",
};

export const STREAK_LABELS: Record<StreakKind, string> = {
  workout: "Workout",
  nutrition: "Nutrition",
  water: "Hydration",
  login: "Check-in",
  coach: "Coach",
  reminder: "Reminders",
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  nutrition: "Nutrition",
  workout: "Workout",
  hydration: "Hydration",
  consistency: "Consistency",
  community: "Community",
  milestone: "Milestones",
};

export const DIFFICULTY_STYLES: Record<AchievementDifficulty, { label: string; className: string }> = {
  bronze: { label: "Bronze", className: "bg-[#B87333]/15 text-[#8a5522] border-[#B87333]/30" },
  silver: { label: "Silver", className: "bg-muted text-muted-foreground border-border" },
  gold: { label: "Gold", className: "bg-accent/20 text-accent-foreground border-accent/40" },
  platinum: { label: "Platinum", className: "bg-primary/15 text-primary border-primary/30" },
};

/** Local ISO date (YYYY-MM-DD) in the browser's timezone. */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function initialsOf(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "NA";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "NA";
}
