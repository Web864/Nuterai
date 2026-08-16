-- Phase 1: server-side rate limiting for the four Gemini-backed AI endpoints
-- (sendCoachMessage, analyzeMeal, analyzeMealPhoto, generateWorkoutPlan).
-- Postgres-backed rather than in-memory because the app runs as stateless
-- serverless functions (Vercel/Cloudflare via Nitro) — an in-memory counter
-- would not survive across invocations, let alone across instances.
--
-- Phase 1-C patch: the limits (burst/window/daily) are hardcoded inside this
-- function rather than accepted as parameters. An earlier version took them
-- as p_burst_limit/p_burst_window_seconds/p_daily_limit arguments — any
-- authenticated caller could invoke the RPC directly (outside the app's own
-- server functions) with artificially large values and grant themselves an
-- unlimited quota. The database must be the sole source of truth for what
-- the limits are; a client can influence only which endpoint it's asking
-- about, never how permissive the check is.

CREATE TABLE public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_usage_events_user_endpoint_time
  ON public.ai_usage_events (user_id, endpoint, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
-- No client-facing policies: rows are only ever written/read through
-- check_ai_rate_limit() below (SECURITY DEFINER) or the service role. This
-- mirrors the xp_events pattern established in 20260807120300 — a user
-- cannot see or forge their own usage history to game the limiter.
GRANT ALL ON public.ai_usage_events TO service_role;

-- check_ai_rate_limit: atomic check-and-record. Takes a per-(user,endpoint)
-- Postgres advisory lock for the duration of the transaction so concurrent
-- parallel requests from the same user serialize instead of racing past the
-- count check — without this, two simultaneous requests could both read a
-- count below the limit and both be admitted, defeating the limit entirely.
-- Uses auth.uid() directly rather than a caller-supplied user id, so there is
-- no parameter a client could manipulate to check or consume someone else's
-- quota (same reasoning as the auth.uid()-only guard added to award_xp /
-- record_streak in 20260801093237). The only input is which endpoint is
-- being checked; the limits for that endpoint are looked up server-side
-- below and cannot be overridden by the caller. Unrecognized endpoint names
-- are rejected outright rather than silently falling back to some default.
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(p_endpoint TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_burst_limit INT;
  v_burst_window_seconds INT;
  v_daily_limit INT;
  v_burst_count INT;
  v_daily_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Production limits (engineering defaults, see Phase 1 report — not
  -- measured production economics, since the app hasn't shipped yet).
  -- meal_vision gets the tightest caps since an image payload is the most
  -- expensive call; workout the tightest overall since a plan is meant to
  -- be generated occasionally, not repeatedly. Changing these numbers means
  -- editing this function, not passing a different argument.
  CASE p_endpoint
    WHEN 'coach' THEN
      v_burst_limit := 8; v_burst_window_seconds := 300; v_daily_limit := 40;
    WHEN 'meal_text' THEN
      v_burst_limit := 10; v_burst_window_seconds := 300; v_daily_limit := 50;
    WHEN 'meal_vision' THEN
      v_burst_limit := 6; v_burst_window_seconds := 300; v_daily_limit := 25;
    WHEN 'workout' THEN
      v_burst_limit := 3; v_burst_window_seconds := 300; v_daily_limit := 8;
    ELSE
      RAISE EXCEPTION 'Unknown rate-limit endpoint: %', p_endpoint;
  END CASE;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_endpoint, 0));

  SELECT count(*) INTO v_burst_count
  FROM public.ai_usage_events
  WHERE user_id = v_user_id
    AND endpoint = p_endpoint
    AND created_at > now() - make_interval(secs => v_burst_window_seconds);

  IF v_burst_count >= v_burst_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'burst',
      'retry_after_seconds', v_burst_window_seconds
    );
  END IF;

  SELECT count(*) INTO v_daily_count
  FROM public.ai_usage_events
  WHERE user_id = v_user_id
    AND endpoint = p_endpoint
    AND created_at > now() - interval '24 hours';

  IF v_daily_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily',
      'retry_after_seconds', 86400
    );
  END IF;

  -- Only an admitted (allowed=true) request is recorded, and it's recorded
  -- here — at admission time, before the caller goes on to invoke Gemini.
  -- Rejected checks (burst/daily already at the cap) are not recorded: no
  -- backend work happened for them, so there's nothing to count. This still
  -- bounds "a failing AI provider doesn't cost unlimited resources": every
  -- retry must independently pass this same admission check, so a user
  -- hammering retries against a failing Gemini call still exhausts their
  -- burst/daily quota after at most burst_limit/daily_limit admitted
  -- attempts, regardless of whether each individual Gemini call downstream
  -- succeeds or fails.
  INSERT INTO public.ai_usage_events (user_id, endpoint) VALUES (v_user_id, p_endpoint);

  RETURN jsonb_build_object('allowed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT) TO authenticated;
