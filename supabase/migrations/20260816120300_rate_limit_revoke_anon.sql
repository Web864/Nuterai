-- Phase 1-C hygiene fix: live verification after deploying
-- 20260816120100_ai_rate_limiting.sql found EXECUTE on
-- check_ai_rate_limit(text) granted to anon in production, alongside the
-- intended `authenticated` grant. This wasn't added by that migration's own
-- REVOKE ALL FROM PUBLIC / GRANT TO authenticated statements — almost
-- certainly a project-level default privilege applied automatically to
-- newly created public-schema functions. Not exploitable: the function's
-- own `auth.uid() IS NULL` check rejects an anonymous caller with an
-- "Unauthorized" exception before anything else runs, so no quota could
-- ever be read, spoofed, or consumed this way. Still worth closing to match
-- the intended least-privilege design and the grants already documented for
-- this function. Only removes the anon grant; authenticated is untouched.

REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT) FROM anon;
