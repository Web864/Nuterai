DROP INDEX IF EXISTS public.reminders_user_source_uidx;

CREATE UNIQUE INDEX reminders_user_source_uidx
  ON public.reminders(user_id, source, source_id);