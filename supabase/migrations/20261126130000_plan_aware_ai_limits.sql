-- Plan-aware AI limits.
--
-- Before this migration every account got the same caps (coach 40/day, photo
-- scans 25/day, workout plans 8/day), while the pricing page promised Free
-- users 10 coach messages and 5 scans a day and Pro users "unlimited". The
-- advertised plan and the enforced plan now come from one place: this
-- function. Keep src/lib/billing/plans.ts (PLANS.*.limits) in sync with the
-- numbers below; tests/unit/plan-limits-sync.test.ts checks that they match.
--
-- The effective plan is read from public.subscriptions with the same rule as
-- effectivePlan() in plans.ts: plan 'pro' counts only while the status is
-- 'active' or 'trialing'. Anything else (no row, canceled, past_due) is Free.
-- The function still takes only p_endpoint and reads auth.uid() itself, so a
-- caller cannot choose their plan or their limits (see the Phase 1-C note in
-- 20260816120100_ai_rate_limiting.sql).
--
-- "Unlimited" on Pro is a fair-use cap, not literally unlimited: every call
-- costs money at the AI provider, so the pricing copy states the numbers.

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(p_endpoint TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plan TEXT := 'free';
  v_burst_limit INT;
  v_burst_window_seconds INT := 300;
  v_daily_limit INT;
  v_burst_count INT;
  v_daily_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT CASE WHEN s.plan::text = 'pro' AND s.status::text IN ('active', 'trialing')
              THEN 'pro' ELSE 'free' END
    INTO v_plan
  FROM public.subscriptions s
  WHERE s.user_id = v_user_id;
  v_plan := COALESCE(v_plan, 'free');

  IF v_plan = 'pro' THEN
    CASE p_endpoint
      WHEN 'coach' THEN       v_burst_limit := 20; v_daily_limit := 150;
      WHEN 'meal_text' THEN   v_burst_limit := 20; v_daily_limit := 150;
      WHEN 'meal_vision' THEN v_burst_limit := 10; v_daily_limit := 60;
      WHEN 'workout' THEN     v_burst_limit := 5;  v_daily_limit := 20;
      ELSE
        RAISE EXCEPTION 'Unknown rate-limit endpoint: %', p_endpoint;
    END CASE;
  ELSE
    CASE p_endpoint
      WHEN 'coach' THEN       v_burst_limit := 5;  v_daily_limit := 10;
      WHEN 'meal_text' THEN   v_burst_limit := 10; v_daily_limit := 30;
      WHEN 'meal_vision' THEN v_burst_limit := 3;  v_daily_limit := 5;
      WHEN 'workout' THEN     v_burst_limit := 2;  v_daily_limit := 2;
      ELSE
        RAISE EXCEPTION 'Unknown rate-limit endpoint: %', p_endpoint;
    END CASE;
  END IF;

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
      'plan', v_plan,
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
      'plan', v_plan,
      'retry_after_seconds', 86400
    );
  END IF;

  INSERT INTO public.ai_usage_events (user_id, endpoint) VALUES (v_user_id, p_endpoint);

  RETURN jsonb_build_object('allowed', true, 'plan', v_plan);
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_rate_limit(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT) TO authenticated;
