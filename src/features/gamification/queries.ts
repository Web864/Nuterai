import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { progressAchievement } from "@/lib/gamification.functions";
import type { Tables } from "@/integrations/supabase/types";
import {
  XP_REWARDS,
  XP_LABELS,
  localDay,
  type StreakKind,
  type XpReason,
} from "@/lib/gamification";

export type UserStats = Tables<"user_stats">;
export type XpEvent = Tables<"xp_events">;
export type Achievement = Tables<"achievements">;
export type UserAchievement = Tables<"user_achievements">;
export type StreakHistoryRow = Tables<"streak_history">;

export type AchievementWithProgress = Achievement & {
  progress: number;
  unlocked_at: string | null;
};

export type LeaderboardRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  level: number;
  value: number;
  rank: number;
  is_self: boolean;
};

export type ProgressResult = {
  code: string;
  title: string;
  progress: number;
  target: number;
  unlocked: boolean;
  xp_reward: number;
  difficulty: string;
  icon: string;
};

export type AwardResult = {
  xp: number;
  level: number;
  leveled_up: boolean;
  previous_level: number;
};

/* ------------------------------- queries ------------------------------- */

export const statsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["stats", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserStats | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const xpHistoryQueryOptions = (userId: string | undefined, limit = 60) =>
  queryOptions({
    queryKey: ["xp-history", userId, limit],
    enabled: !!userId,
    queryFn: async (): Promise<XpEvent[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("xp_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

export const achievementsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["achievements", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AchievementWithProgress[]> => {
      if (!userId) return [];
      const [catalog, mine] = await Promise.all([
        supabase.from("achievements").select("*").order("sort_order", { ascending: true }),
        supabase.from("user_achievements").select("*").eq("user_id", userId),
      ]);
      if (catalog.error) throw catalog.error;
      if (mine.error) throw mine.error;
      const byCode = new Map((mine.data ?? []).map((u) => [u.achievement_code, u]));
      return (catalog.data ?? []).map((a) => {
        const u = byCode.get(a.code);
        return {
          ...a,
          progress: Number(u?.progress ?? 0),
          unlocked_at: u?.unlocked_at ?? null,
        };
      });
    },
  });

/** Achievements of another user — only unlocked ones are meaningful publicly. */
export const publicAchievementsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["achievements-public", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AchievementWithProgress[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", userId)
        .not("unlocked_at", "is", null)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((r) => r.achievements)
        .map((r) => ({
          ...(r.achievements as Achievement),
          progress: Number(r.progress),
          unlocked_at: r.unlocked_at,
        }));
    },
  });

export const streakHistoryQueryOptions = (userId: string | undefined, kind?: StreakKind) =>
  queryOptions({
    queryKey: ["streak-history", userId, kind ?? "all"],
    enabled: !!userId,
    queryFn: async (): Promise<StreakHistoryRow[]> => {
      if (!userId) return [];
      let q = supabase
        .from("streak_history")
        .select("*")
        .eq("user_id", userId)
        .order("day", { ascending: false })
        .limit(180);
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export type LeaderboardScope = "global" | "friends";
export type LeaderboardMetric = "xp" | "workout_streak" | "nutrition_streak" | "login_streak";
export type LeaderboardWindow = "week" | "month" | "all";

export const leaderboardQueryOptions = (
  scope: LeaderboardScope,
  metric: LeaderboardMetric,
  window: LeaderboardWindow,
  limit = 25,
) =>
  queryOptions({
    queryKey: ["leaderboard", scope, metric, window, limit],
    queryFn: async (): Promise<LeaderboardRow[]> => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        _scope: scope,
        _metric: metric,
        _window: window,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, value: Number(r.value), rank: Number(r.rank) }));
    },
    staleTime: 60_000,
  });

/* ------------------------------ mutations ------------------------------ */

/** Ensure a stats row exists for the user (idempotent). */
export async function ensureStats(userId: string): Promise<void> {
  const { error } = await supabase.from("user_stats").insert({ user_id: userId });
  // 23505 = already exists, which is the expected happy path after the first call.
  if (error && error.code !== "23505") throw error;
}

export async function awardXpRaw(
  userId: string,
  amount: number,
  reason: string,
  source = "system",
  metadata: Record<string, unknown> = {},
): Promise<AwardResult | null> {
  const { data, error } = await supabase.rpc("award_xp", {
    _user_id: userId,
    _amount: amount,
    _reason: reason,
    _source: source,
    _metadata: metadata as never,
  });
  if (error) throw error;
  return (data as unknown as AwardResult) ?? null;
}

export async function recordStreakRaw(
  userId: string,
  kind: StreakKind,
  day = localDay(),
): Promise<{ kind: StreakKind; streak: number; longest: number; is_new_day: boolean } | null> {
  const { data, error } = await supabase.rpc("record_streak", {
    _user_id: userId,
    _kind: kind,
    _day: day,
  });
  if (error) throw error;
  return data as never;
}

export async function progressAchievementRaw(
  // progress_achievement() is now service_role-only; the server function
  // derives the real user id from the caller's verified session, so the
  // client-supplied id here is intentionally unused.
  _userId: string,
  code: string,
  progress: number,
  mode: "set" | "increment" = "set",
): Promise<ProgressResult | null> {
  const data = await progressAchievement({ data: { code, progress, mode } });
  const r = data as unknown as ProgressResult;
  return r && r.code ? r : null;
}

export function xpFor(reason: XpReason): { amount: number; label: string } {
  return { amount: XP_REWARDS[reason], label: XP_LABELS[reason] };
}

export function useLogActivity(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      kind: Tables<"activity_events">["kind"];
      title: string;
      description?: string | null;
      metadata?: Record<string, unknown>;
      xp_awarded?: number;
    }) => {
      const { error } = await supabase.from("activity_events").insert({
        user_id: userId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        metadata: (input.metadata ?? {}) as never,
        xp_awarded: input.xp_awarded ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });
}
