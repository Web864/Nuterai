-- Security Advisor: public.progress_achievement() is SECURITY DEFINER and
-- was directly callable by any authenticated user via
-- POST /rest/v1/rpc/progress_achievement. Its target_id already resolves to
-- COALESCE(auth.uid(), _user_id) (see 20260801093237), so a caller could
-- never advance *another* user's progress — but nothing stopped a signed-in
-- user from calling the RPC directly to instantly max out any achievement
-- (and collect its XP reward) without the underlying action ever happening,
-- bypassing the app's trackEvent() gating entirely. That gating only exists
-- in client JS, which PostgREST has no way to enforce.
--
-- Lock the RPC down to service_role. The frontend now goes through the
-- progressAchievement server function (src/lib/gamification.functions.ts),
-- which authenticates the caller via requireSupabaseAuth and passes their
-- verified user id — never one the client supplies in the request body.
REVOKE EXECUTE ON FUNCTION public.progress_achievement(uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.progress_achievement(uuid, text, numeric, text) TO service_role;

-- Explicit safe search_path for the remaining SECURITY DEFINER surface
-- (defense in depth; every reference in the function body is already
-- schema-qualified as public.*).
ALTER FUNCTION public.progress_achievement(uuid, text, numeric, text) SET search_path = pg_catalog, public;
