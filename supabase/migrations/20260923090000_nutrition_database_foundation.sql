-- Canonical, shared nutrition-reference data. User meal history remains in
-- meal_entries and is deliberately not linked or migrated in this phase.

CREATE TABLE public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT foods_verification_status_check
    CHECK (verification_status IN ('unverified', 'community', 'verified', 'deprecated'))
);

CREATE UNIQUE INDEX foods_source_source_id_key
  ON public.foods (source, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX foods_canonical_name_idx
  ON public.foods (lower(canonical_name));

CREATE TABLE public.food_nutrition_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL UNIQUE REFERENCES public.foods(id) ON DELETE CASCADE,
  calories_per_100g NUMERIC NOT NULL CHECK (calories_per_100g >= 0),
  protein_per_100g NUMERIC NOT NULL CHECK (protein_per_100g >= 0),
  carbs_per_100g NUMERIC NOT NULL CHECK (carbs_per_100g >= 0),
  fat_per_100g NUMERIC NOT NULL CHECK (fat_per_100g >= 0),
  fiber_per_100g NUMERIC NOT NULL CHECK (fiber_per_100g >= 0),
  sugar_per_100g NUMERIC CHECK (sugar_per_100g >= 0),
  sodium_mg_per_100g NUMERIC CHECK (sodium_mg_per_100g >= 0),
  source TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT food_nutrition_facts_verification_status_check
    CHECK (verification_status IN ('unverified', 'community', 'verified', 'deprecated'))
);

CREATE TABLE public.food_servings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  grams NUMERIC NOT NULL CHECK (grams > 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX food_servings_food_name_unit_key
  ON public.food_servings (food_id, lower(name), lower(unit));

CREATE INDEX food_servings_food_id_idx ON public.food_servings (food_id);

CREATE TABLE public.food_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  locale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX food_aliases_alias_locale_key
  ON public.food_aliases (lower(alias), COALESCE(locale, ''));

CREATE INDEX food_aliases_food_id_idx ON public.food_aliases (food_id);

CREATE TRIGGER update_foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_nutrition_facts_updated_at
  BEFORE UPDATE ON public.food_nutrition_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.foods, public.food_nutrition_facts, public.food_servings, public.food_aliases
  TO authenticated;
GRANT ALL ON public.foods, public.food_nutrition_facts, public.food_servings, public.food_aliases
  TO service_role;
REVOKE ALL ON public.foods, public.food_nutrition_facts, public.food_servings, public.food_aliases
  FROM anon;

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_nutrition_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_servings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read canonical foods"
  ON public.foods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read canonical food nutrition"
  ON public.food_nutrition_facts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read canonical food servings"
  ON public.food_servings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read canonical food aliases"
  ON public.food_aliases FOR SELECT TO authenticated USING (true);
