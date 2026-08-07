-- Fix: profiles.show_stats / show_achievements are documented privacy toggles
-- (see src/routes/_authenticated/u.$username.tsx) but were only enforced in
-- the UI. can_view_user() (used by the "read visible stats" / "read visible
-- streaks" / "read visible achievements" policies) only checks is_public /
-- friendship, so any viewer who could see the profile at all could still
-- read raw user_stats, streak_history, and user_achievements rows over the
-- API even after the owner explicitly hid them. Add toggle-aware view
-- functions and use them in place of can_view_user() for those three tables.
-- Owners can always see their own rows regardless of the toggle.

CREATE OR REPLACE FUNCTION public.can_view_user_stats(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _target
      OR (
        public.can_view_user(_viewer, _target)
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _target AND show_stats)
      );
$$;

CREATE OR REPLACE FUNCTION public.can_view_user_achievements(_viewer uuid, _target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _target
      OR (
        public.can_view_user(_viewer, _target)
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _target AND show_achievements)
      );
$$;

DROP POLICY IF EXISTS "read visible stats" ON public.user_stats;
CREATE POLICY "read visible stats" ON public.user_stats FOR SELECT TO authenticated
  USING (public.can_view_user_stats(auth.uid(), user_id));

DROP POLICY IF EXISTS "read visible streaks" ON public.streak_history;
CREATE POLICY "read visible streaks" ON public.streak_history FOR SELECT TO authenticated
  USING (public.can_view_user_stats(auth.uid(), user_id));

DROP POLICY IF EXISTS "read visible achievements" ON public.user_achievements;
CREATE POLICY "read visible achievements" ON public.user_achievements FOR SELECT TO authenticated
  USING (public.can_view_user_achievements(auth.uid(), user_id));
