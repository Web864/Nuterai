
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_profile_public(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_user(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_user_stats(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.record_streak(uuid, public.streak_kind, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.progress_achievement(uuid, text, numeric, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, text, text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_users(text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_activity_feed(integer, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_post_counters() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;

GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_streak(uuid, public.streak_kind, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.progress_achievement(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_feed(integer, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
