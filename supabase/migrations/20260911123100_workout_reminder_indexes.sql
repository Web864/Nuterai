CREATE INDEX IF NOT EXISTS reminders_workout_plan_source_idx
ON public.reminders(user_id, source, linked_plan_item_id)
WHERE source = 'workout_plan';