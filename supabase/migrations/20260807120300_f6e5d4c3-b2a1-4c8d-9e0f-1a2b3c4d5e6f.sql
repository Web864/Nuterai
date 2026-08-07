-- Fix: user_stats/xp_events/streak_history/user_achievements only checked
-- auth.uid() = user_id on INSERT/UPDATE, with no validation of the values
-- being written. The app's own client code never writes these tables
-- directly (confirmed against src/features/gamification/queries.ts) — all
-- real writes go through the capped SECURITY DEFINER RPCs award_xp(),
-- record_streak(), and progress_achievement(), which bypass RLS as the
-- table owner. But nothing stopped a client from calling PostgREST directly
-- to self-grant XP, streaks, or achievements (e.g. POST /xp_events with an
-- arbitrary `amount`), which fed straight into get_leaderboard() and the
-- achievements catalog. Lock these tables down to what the client actually
-- needs: read access, and (for user_stats only) the bare "create my row"
-- insert that ensureStats() performs.

DROP POLICY IF EXISTS "insert own xp" ON public.xp_events;

DROP POLICY IF EXISTS "insert own streaks" ON public.streak_history;
DROP POLICY IF EXISTS "update own streaks" ON public.streak_history;

DROP POLICY IF EXISTS "insert own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "update own achievements" ON public.user_achievements;

DROP POLICY IF EXISTS "insert own stats" ON public.user_stats;
CREATE POLICY "insert own stats" ON public.user_stats FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND xp = 0 AND level = 1
    AND workout_streak = 0 AND nutrition_streak = 0 AND water_streak = 0
    AND login_streak = 0 AND coach_streak = 0 AND reminder_streak = 0
  );
DROP POLICY IF EXISTS "update own stats" ON public.user_stats;
