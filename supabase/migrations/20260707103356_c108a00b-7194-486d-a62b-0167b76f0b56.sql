
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.unit_system AS ENUM ('metric', 'imperial');
CREATE TYPE public.sex_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');
CREATE TYPE public.activity_level AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE public.fitness_goal AS ENUM ('lose_weight', 'maintain', 'gain_weight', 'build_muscle', 'improve_health', 'boost_energy');
CREATE TYPE public.diet_preference AS ENUM ('omnivore', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher', 'keto', 'mediterranean', 'low_carb', 'high_protein');
CREATE TYPE public.cooking_skill AS ENUM ('none', 'beginner', 'intermediate', 'advanced');
CREATE TYPE public.gym_access AS ENUM ('full_gym', 'home_gym', 'basic_equipment', 'no_equipment');
CREATE TYPE public.workout_experience AS ENUM ('none', 'beginner', 'intermediate', 'advanced');

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  country TEXT,
  city TEXT,
  language TEXT DEFAULT 'en',
  religion TEXT,
  locale TEXT DEFAULT 'en-US',
  units public.unit_system NOT NULL DEFAULT 'metric',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================
-- USER GOALS
-- =========================
CREATE TABLE public.user_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- biometrics
  age INTEGER,
  sex public.sex_type,
  birth_date DATE,
  height_cm NUMERIC(5,2),
  current_weight_kg NUMERIC(5,2),
  target_weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  -- lifestyle
  activity_level public.activity_level DEFAULT 'moderate',
  fitness_goal public.fitness_goal DEFAULT 'improve_health',
  target_timeline_weeks INTEGER,
  pace_kg_per_week NUMERIC(3,2) DEFAULT 0.5,
  -- diet
  diet_preference public.diet_preference DEFAULT 'omnivore',
  allergies TEXT[] DEFAULT '{}',
  medical_conditions TEXT[] DEFAULT '{}',
  cooking_skill public.cooking_skill DEFAULT 'beginner',
  kitchen_equipment TEXT[] DEFAULT '{}',
  daily_food_budget NUMERIC(10,2),
  budget_currency TEXT DEFAULT 'USD',
  -- fitness
  gym_access public.gym_access DEFAULT 'no_equipment',
  workout_experience public.workout_experience DEFAULT 'beginner',
  -- schedule & wellness
  wake_time TIME,
  sleep_time TIME,
  office_start TIME,
  office_end TIME,
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 10),
  daily_water_ml INTEGER,
  smoking BOOLEAN DEFAULT false,
  alcohol BOOLEAN DEFAULT false,
  -- calculated targets
  bmr_kcal INTEGER,
  tdee_kcal INTEGER,
  daily_calorie_target INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  fiber_g INTEGER,
  water_target_ml INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own goals" ON public.user_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.user_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.user_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================
-- TRIGGERS
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
