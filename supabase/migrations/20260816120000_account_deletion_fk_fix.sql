-- Phase 1: account deletion relies on ON DELETE CASCADE from auth.users to
-- clean up every user-owned table automatically. workout_plans/workout_sessions
-- were created with `user_id UUID NOT NULL` but no FK to auth.users at all
-- (verified by grep across every migration — no REFERENCES auth.users clause
-- exists for either table). workout_plan_days/exercise_logs already cascade
-- transitively via plan_id/session_id, so fixing these two root tables closes
-- the gap for all four.
--
-- reminders/notifications are queried by the app (src/features/reminders/
-- queries.ts) but have no CREATE TABLE in any tracked migration — schema
-- drift from outside this migration history. Their current constraints could
-- not be introspected from this environment (no Postgres/CLI credential was
-- available, only PostgREST-level API keys), so these are handled with the
-- same defensive logic below.
--
-- Phase 1-C patch: the original version of this migration only checked
-- whether *any* foreign key from user_id to auth.users(id) already existed
-- (contype = 'f') before deciding to add one. That's insufficient — an
-- existing FK with ON DELETE NO ACTION/RESTRICT would satisfy that check
-- and be left in place untouched, silently defeating the entire point of
-- this migration (account deletion would still fail or orphan rows on
-- these tables). Each block below now inspects pg_constraint.confdeltype
-- (the actual ON DELETE behavior: 'c' = cascade, 'a' = no action,
-- 'r' = restrict, 'n' = set null, 'd' = set default) via a join back to
-- pg_attribute to confirm the FK is specifically on the user_id column, and:
--   * no matching FK at all                -> add one fresh, as before
--   * matching FK, already ON DELETE CASCADE -> no-op, nothing to do
--   * matching FK, NOT ON DELETE CASCADE     -> drop that one constraint by
--     its actual name and re-add it as CASCADE
-- Postgres has no ALTER CONSTRAINT to change a foreign key's delete action
-- in place; DROP + re-ADD is the only mechanism. This is scoped as tightly
-- as possible: only the single constraint matched by (this table, this
-- column, references auth.users(id)) is ever dropped, inside the same
-- migration transaction as its replacement, so integrity is never actually
-- absent at any point a concurrent transaction could observe. No other
-- constraint on these tables is touched.

DO $$
DECLARE
  v_conname TEXT;
  v_confdeltype CHAR;
BEGIN
  SELECT c.conname, c.confdeltype INTO v_conname, v_confdeltype
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.workout_plans'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'auth.users'::regclass
    AND a.attname = 'user_id'
    AND array_length(c.conkey, 1) = 1;

  IF v_conname IS NULL THEN
    ALTER TABLE public.workout_plans
      ADD CONSTRAINT workout_plans_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSIF v_confdeltype <> 'c' THEN
    EXECUTE format('ALTER TABLE public.workout_plans DROP CONSTRAINT %I', v_conname);
    ALTER TABLE public.workout_plans
      ADD CONSTRAINT workout_plans_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
DECLARE
  v_conname TEXT;
  v_confdeltype CHAR;
BEGIN
  SELECT c.conname, c.confdeltype INTO v_conname, v_confdeltype
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.workout_sessions'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'auth.users'::regclass
    AND a.attname = 'user_id'
    AND array_length(c.conkey, 1) = 1;

  IF v_conname IS NULL THEN
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSIF v_confdeltype <> 'c' THEN
    EXECUTE format('ALTER TABLE public.workout_sessions DROP CONSTRAINT %I', v_conname);
    ALTER TABLE public.workout_sessions
      ADD CONSTRAINT workout_sessions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
DECLARE
  v_conname TEXT;
  v_confdeltype CHAR;
BEGIN
  IF to_regclass('public.reminders') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.conname, c.confdeltype INTO v_conname, v_confdeltype
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.reminders'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'auth.users'::regclass
    AND a.attname = 'user_id'
    AND array_length(c.conkey, 1) = 1;

  IF v_conname IS NULL THEN
    ALTER TABLE public.reminders
      ADD CONSTRAINT reminders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSIF v_confdeltype <> 'c' THEN
    EXECUTE format('ALTER TABLE public.reminders DROP CONSTRAINT %I', v_conname);
    ALTER TABLE public.reminders
      ADD CONSTRAINT reminders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
DECLARE
  v_conname TEXT;
  v_confdeltype CHAR;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.conname, c.confdeltype INTO v_conname, v_confdeltype
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.notifications'::regclass
    AND c.contype = 'f'
    AND c.confrelid = 'auth.users'::regclass
    AND a.attname = 'user_id'
    AND array_length(c.conkey, 1) = 1;

  IF v_conname IS NULL THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  ELSIF v_confdeltype <> 'c' THEN
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', v_conname);
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
