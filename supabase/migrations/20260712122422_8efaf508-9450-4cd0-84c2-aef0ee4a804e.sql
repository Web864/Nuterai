
-- Enums
DO $$ BEGIN
  CREATE TYPE public.reminder_type AS ENUM ('meal','workout','water','weight','sleep','medication','custom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_action AS ENUM ('pending','completed','snoozed','dismissed','missed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.reminder_type NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  message TEXT,
  -- times of day in HH:MM (24h), local to user timezone
  times TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- 0=Sun..6=Sat; empty array = every day
  days_of_week SMALLINT[] NOT NULL DEFAULT ARRAY[0,1,2,3,4,5,6]::SMALLINT[],
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  one_time_at TIMESTAMPTZ,
  snooze_until TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminders" ON public.reminders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminders_user_idx ON public.reminders(user_id, is_active);

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
  type public.reminder_type NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  body TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  action public.notification_action NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_scheduled_idx
  ON public.notifications(user_id, scheduled_for DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_reminder_slot_uidx
  ON public.notifications(reminder_id, scheduled_for)
  WHERE reminder_id IS NOT NULL;

-- Profile preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT,
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT,
  ADD COLUMN IF NOT EXISTS notification_sound BOOLEAN NOT NULL DEFAULT true;
