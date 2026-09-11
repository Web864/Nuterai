-- Phase 2: Screen Break Reminder
-- Dormant by feature flag. Stores preferences only; no app names, raw usage
-- stats, or device usage timelines are persisted remotely.

DO $$ BEGIN
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'screen_break';
END $$;

CREATE TABLE IF NOT EXISTS public.screen_break_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  interval_minutes INT NOT NULL DEFAULT 20 CHECK (interval_minutes BETWEEN 10 AND 120),
  break_duration_seconds INT NOT NULL DEFAULT 20 CHECK (break_duration_seconds BETWEEN 10 AND 300),
  active_start_time TEXT NOT NULL DEFAULT '08:00' CHECK (active_start_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  active_end_time TEXT NOT NULL DEFAULT '22:00' CHECK (active_end_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  respect_quiet_hours BOOLEAN NOT NULL DEFAULT true,
  vibration_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  snooze_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_break_settings TO authenticated;
GRANT ALL ON public.screen_break_settings TO service_role;
ALTER TABLE public.screen_break_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own screen break settings" ON public.screen_break_settings;
CREATE POLICY "Users manage own screen break settings" ON public.screen_break_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_screen_break_settings_updated ON public.screen_break_settings;
CREATE TRIGGER trg_screen_break_settings_updated
  BEFORE UPDATE ON public.screen_break_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS screen_break_settings_enabled_idx
  ON public.screen_break_settings(user_id, enabled);
