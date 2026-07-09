
-- Enums
CREATE TYPE public.workout_focus AS ENUM ('full_body','upper','lower','push','pull','legs','core','cardio','hiit','mobility','rest','custom');
CREATE TYPE public.workout_difficulty AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE public.workout_source AS ENUM ('ai','manual','template');

-- Plans
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  goal TEXT,
  difficulty public.workout_difficulty NOT NULL DEFAULT 'beginner',
  days_per_week INT NOT NULL DEFAULT 3,
  duration_weeks INT NOT NULL DEFAULT 4,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  source public.workout_source NOT NULL DEFAULT 'manual',
  ai_model TEXT,
  ai_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.workout_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_workout_plans_updated BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_workout_plans_user ON public.workout_plans(user_id, is_active);

-- Plan days
CREATE TABLE public.workout_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_index INT NOT NULL,
  title TEXT NOT NULL,
  focus public.workout_focus NOT NULL DEFAULT 'full_body',
  estimated_minutes INT NOT NULL DEFAULT 45,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plan_days TO authenticated;
GRANT ALL ON public.workout_plan_days TO service_role;
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan days" ON public.workout_plan_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_workout_plan_days_updated BEFORE UPDATE ON public.workout_plan_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_workout_plan_days_plan ON public.workout_plan_days(plan_id, day_index);

-- Sessions
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_day_id UUID REFERENCES public.workout_plan_days(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  focus public.workout_focus NOT NULL DEFAULT 'full_body',
  duration_minutes INT NOT NULL DEFAULT 0,
  calories_kcal INT NOT NULL DEFAULT 0,
  perceived_effort INT,
  notes TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_workout_sessions_updated BEFORE UPDATE ON public.workout_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, logged_date DESC);

-- Exercise logs
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT,
  sets INT NOT NULL DEFAULT 0,
  reps INT NOT NULL DEFAULT 0,
  weight_kg NUMERIC(6,2),
  duration_seconds INT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_logs TO authenticated;
GRANT ALL ON public.exercise_logs TO service_role;
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise logs" ON public.exercise_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_exercise_logs_session ON public.exercise_logs(session_id, order_index);
