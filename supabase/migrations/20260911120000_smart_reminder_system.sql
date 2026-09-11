-- Smart Reminder System: richer reminder metadata, duplicate prevention,
-- lightweight history, and user-scoped RLS.

DO $$ BEGIN
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'breakfast';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'lunch';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'dinner';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'snack';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'supplement';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'weigh-in';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'ai-created';
EXCEPTION WHEN undefined_object THEN
  CREATE TYPE public.reminder_type AS ENUM (
    'meal','breakfast','lunch','dinner','snack','workout','water','weight',
    'weigh-in','sleep','medication','supplement','custom','ai-created'
  );
END $$;

DO $$ BEGIN
  CREATE TYPE public.reminder_source AS ENUM ('manual','diet_plan','water_plan','ai_coach','system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.reminder_creator AS ENUM ('user','system','ai_coach');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.reminder_event_type AS ENUM ('triggered','completed','snoozed','skipped','deleted','rescheduled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_rule JSONB NOT NULL DEFAULT '{"frequency":"daily"}'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS source public.reminder_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS linked_plan_item_id TEXT,
  ADD COLUMN IF NOT EXISTS created_by public.reminder_creator NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_trigger_at TIMESTAMPTZ;

UPDATE public.reminders
SET
  enabled = COALESCE(enabled, is_active),
  scheduled_time = COALESCE(scheduled_time, times[1]),
  snoozed_until = COALESCE(snoozed_until, snooze_until),
  recurrence_rule = CASE
    WHEN NOT is_recurring THEN jsonb_build_object('frequency', 'once')
    WHEN days_of_week = ARRAY[1,2,3,4,5]::smallint[] THEN jsonb_build_object('frequency', 'weekdays')
    WHEN days_of_week = ARRAY[0,6]::smallint[] THEN jsonb_build_object('frequency', 'weekends')
    WHEN coalesce(array_length(days_of_week, 1), 0) = 7 THEN jsonb_build_object('frequency', 'daily')
    ELSE jsonb_build_object('frequency', 'specific_days', 'days', days_of_week)
  END
WHERE enabled IS NULL OR scheduled_time IS NULL;

ALTER TABLE public.reminders
  ALTER COLUMN enabled SET DEFAULT true,
  ALTER COLUMN enabled SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reminders_user_source_uidx
  ON public.reminders(user_id, source, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reminders_user_enabled_next_idx
  ON public.reminders(user_id, enabled, next_trigger_at);

CREATE INDEX IF NOT EXISTS reminders_user_source_idx
  ON public.reminders(user_id, source);

CREATE TABLE IF NOT EXISTS public.reminder_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE SET NULL,
  event_type public.reminder_event_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_events TO authenticated;
GRANT ALL ON public.reminder_events TO service_role;
ALTER TABLE public.reminder_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reminder events" ON public.reminder_events;
CREATE POLICY "Users manage own reminder events" ON public.reminder_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminder_events_user_occurred_idx
  ON public.reminder_events(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS reminder_events_reminder_idx
  ON public.reminder_events(reminder_id, occurred_at DESC);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS reminder_event_id UUID REFERENCES public.reminder_events(id) ON DELETE SET NULL;
