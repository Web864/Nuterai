
-- Meal type enum
DO $$ BEGIN
  CREATE TYPE public.meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.meal_source AS ENUM ('manual', 'ai_text', 'ai_photo', 'favorite');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Meal entries
CREATE TABLE public.meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  meal_type public.meal_type NOT NULL DEFAULT 'snack',
  name TEXT NOT NULL,
  description TEXT,
  serving_qty NUMERIC NOT NULL DEFAULT 1,
  serving_unit TEXT DEFAULT 'serving',
  calories_kcal NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  source public.meal_source NOT NULL DEFAULT 'manual',
  ai_model TEXT,
  ai_confidence NUMERIC,
  ai_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_entries TO authenticated;
GRANT ALL ON public.meal_entries TO service_role;

ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own meals" ON public.meal_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own meals" ON public.meal_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own meals" ON public.meal_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own meals" ON public.meal_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX meal_entries_user_date_idx ON public.meal_entries (user_id, logged_date DESC);
CREATE INDEX meal_entries_user_logged_at_idx ON public.meal_entries (user_id, logged_at DESC);

CREATE TRIGGER update_meal_entries_updated_at
  BEFORE UPDATE ON public.meal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Water logs
CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own water" ON public.water_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own water" ON public.water_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own water" ON public.water_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX water_logs_user_date_idx ON public.water_logs (user_id, logged_date DESC);

-- Weight logs
CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC NOT NULL CHECK (weight_kg > 20 AND weight_kg < 500),
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  logged_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own weight" ON public.weight_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own weight" ON public.weight_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own weight" ON public.weight_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own weight" ON public.weight_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX weight_logs_user_date_idx ON public.weight_logs (user_id, logged_date DESC);
