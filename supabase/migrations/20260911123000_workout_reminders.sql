DO $$ BEGIN
  ALTER TYPE public.reminder_source ADD VALUE IF NOT EXISTS 'workout_plan';
EXCEPTION WHEN undefined_object THEN
  CREATE TYPE public.reminder_source AS ENUM ('manual','diet_plan','water_plan','workout_plan','ai_coach','system');
END $$;

DO $$ BEGIN
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'walking';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'stretching';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'cardio';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'strength_training';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'yoga';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'recovery';
  ALTER TYPE public.reminder_type ADD VALUE IF NOT EXISTS 'custom_exercise';
END $$;

DO $$ BEGIN
  ALTER TYPE public.reminder_event_type ADD VALUE IF NOT EXISTS 'started';
EXCEPTION WHEN undefined_object THEN null; END $$;

