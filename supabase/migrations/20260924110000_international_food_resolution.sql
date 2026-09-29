-- Additive lookup identities for international food names. Meal snapshots are
-- intentionally untouched; these fields only improve future food resolution.

CREATE OR REPLACE FUNCTION public.normalize_food_identity(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT nullif(
    trim(
      regexp_replace(
        lower(coalesce(value, '')),
        '[^[:alnum:]]+',
        ' ',
        'g'
      )
    ),
    ''
  );
$$;

ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

ALTER TABLE public.food_aliases
  ADD COLUMN IF NOT EXISTS normalized_alias TEXT;

UPDATE public.foods
SET normalized_name = public.normalize_food_identity(canonical_name)
WHERE normalized_name IS NULL;

UPDATE public.food_aliases
SET normalized_alias = public.normalize_food_identity(alias)
WHERE normalized_alias IS NULL;

ALTER TABLE public.foods
  ALTER COLUMN normalized_name SET NOT NULL;

ALTER TABLE public.food_aliases
  ALTER COLUMN normalized_alias SET NOT NULL;

CREATE INDEX IF NOT EXISTS foods_normalized_name_idx
  ON public.foods (normalized_name);

CREATE INDEX IF NOT EXISTS food_aliases_normalized_alias_idx
  ON public.food_aliases (normalized_alias);

-- Source-scoped identity prevents a repeated importer from creating a second
-- copy of the same external reference record. It deliberately does not merge
-- records from different sources or user-owned custom foods.
CREATE UNIQUE INDEX IF NOT EXISTS foods_global_source_normalized_name_key
  ON public.foods (source, normalized_name)
  WHERE owner_user_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_food_normalized_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_name := public.normalize_food_identity(NEW.canonical_name);
  IF NEW.normalized_name IS NULL THEN
    RAISE EXCEPTION 'Food name is required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_food_alias_normalized_alias()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.normalized_alias := public.normalize_food_identity(NEW.alias);
  IF NEW.normalized_alias IS NULL THEN
    RAISE EXCEPTION 'Food alias is required';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_food_normalized_name ON public.foods;
CREATE TRIGGER set_food_normalized_name
  BEFORE INSERT OR UPDATE OF canonical_name ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.set_food_normalized_name();

DROP TRIGGER IF EXISTS set_food_alias_normalized_alias ON public.food_aliases;
CREATE TRIGGER set_food_alias_normalized_alias
  BEFORE INSERT OR UPDATE OF alias ON public.food_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_food_alias_normalized_alias();

-- Small, provenance-backed starter record. USDA FoodData Central SR Legacy
-- record 173757 provides values per 100 g and its documented cup weight.
INSERT INTO public.foods (
  canonical_name,
  normalized_name,
  category,
  description,
  source,
  source_id,
  verification_status
)
VALUES (
  'Chickpeas, cooked, without salt',
  public.normalize_food_identity('Chickpeas, cooked, without salt'),
  'legumes',
  'USDA FoodData Central SR Legacy 173757',
  'usda_fdc',
  '173757',
  'verified'
)
ON CONFLICT (source, source_id) WHERE source_id IS NOT NULL DO NOTHING;

INSERT INTO public.food_nutrition_facts (
  food_id,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  fiber_per_100g,
  sugar_per_100g,
  sodium_mg_per_100g,
  source,
  source_id,
  verification_status
)
SELECT
  id,
  164,
  8.86,
  27.42,
  2.59,
  7.6,
  4.8,
  7,
  'usda_fdc',
  '173757',
  'verified'
FROM public.foods
WHERE source = 'usda_fdc' AND source_id = '173757'
ON CONFLICT (food_id) DO NOTHING;

INSERT INTO public.food_servings (food_id, name, unit, grams, is_default)
SELECT id, 'cup', 'cup', 164, true
FROM public.foods
WHERE source = 'usda_fdc' AND source_id = '173757'
ON CONFLICT (food_id, lower(name), lower(unit)) DO NOTHING;

INSERT INTO public.food_aliases (food_id, alias, normalized_alias, locale)
SELECT food.id, aliases.alias, public.normalize_food_identity(aliases.alias), aliases.locale
FROM public.foods AS food
CROSS JOIN (
  VALUES
    ('Cooked chickpeas', NULL::TEXT),
    ('Cooked garbanzo beans', 'en'),
    ('Cooked Bengal gram', 'en')
) AS aliases(alias, locale)
WHERE food.source = 'usda_fdc' AND food.source_id = '173757'
ON CONFLICT (lower(alias), COALESCE(locale, '')) DO NOTHING;
