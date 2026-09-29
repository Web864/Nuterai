-- User-owned custom foods reuse the canonical food/nutrition/serving tables.
-- Global food reference records remain ownerless and cannot be modified by users.
ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.foods
  ADD CONSTRAINT foods_user_provided_owner_check
  CHECK (
    owner_user_id IS NULL
    OR (source = 'user_provided' AND verification_status = 'unverified')
  );

CREATE INDEX IF NOT EXISTS foods_owner_user_id_idx
  ON public.foods (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

ALTER TYPE public.meal_source ADD VALUE IF NOT EXISTS 'recipe';

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  description TEXT,
  servings NUMERIC NOT NULL CHECK (servings > 0),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
  serving_id UUID REFERENCES public.food_servings(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (char_length(trim(unit)) BETWEEN 1 AND 80),
  grams NUMERIC NOT NULL CHECK (grams > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX recipes_user_id_idx ON public.recipes (user_id, updated_at DESC);
CREATE INDEX recipe_ingredients_recipe_id_idx ON public.recipe_ingredients (recipe_id);
CREATE INDEX recipe_ingredients_food_id_idx ON public.recipe_ingredients (food_id);

CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes, public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipes, public.recipe_ingredients TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read canonical foods" ON public.foods;
DROP POLICY IF EXISTS "Authenticated users can read canonical food nutrition" ON public.food_nutrition_facts;
DROP POLICY IF EXISTS "Authenticated users can read canonical food servings" ON public.food_servings;
DROP POLICY IF EXISTS "Authenticated users can read canonical food aliases" ON public.food_aliases;

CREATE POLICY "Users read global or own foods" ON public.foods
  FOR SELECT TO authenticated USING (owner_user_id IS NULL OR owner_user_id = auth.uid());
CREATE POLICY "Users read accessible food nutrition" ON public.food_nutrition_facts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND (f.owner_user_id IS NULL OR f.owner_user_id = auth.uid()))
  );
CREATE POLICY "Users read accessible food servings" ON public.food_servings
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND (f.owner_user_id IS NULL OR f.owner_user_id = auth.uid()))
  );
CREATE POLICY "Users read accessible food aliases" ON public.food_aliases
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND (f.owner_user_id IS NULL OR f.owner_user_id = auth.uid()))
  );

CREATE POLICY "Users manage own custom foods" ON public.foods
  FOR ALL TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid() AND source = 'user_provided' AND verification_status = 'unverified');
CREATE POLICY "Users manage own custom food nutrition" ON public.food_nutrition_facts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND f.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND f.owner_user_id = auth.uid()));
CREATE POLICY "Users manage own custom food servings" ON public.food_servings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND f.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.foods f WHERE f.id = food_id AND f.owner_user_id = auth.uid()));

CREATE POLICY "Users manage own recipes" ON public.recipes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own recipe ingredients" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.upsert_custom_food(
  p_food_id UUID,
  p_name TEXT,
  p_calories_per_100g NUMERIC,
  p_protein_per_100g NUMERIC,
  p_carbs_per_100g NUMERIC,
  p_fat_per_100g NUMERIC,
  p_fiber_per_100g NUMERIC,
  p_sugar_per_100g NUMERIC,
  p_sodium_mg_per_100g NUMERIC,
  p_servings JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_food_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(coalesce(p_name, ''))) = 0 THEN RAISE EXCEPTION 'Food name is required'; END IF;
  IF jsonb_typeof(p_servings) <> 'array' OR jsonb_array_length(p_servings) = 0 THEN
    RAISE EXCEPTION 'At least one serving definition is required';
  END IF;

  IF p_food_id IS NULL THEN
    INSERT INTO public.foods (canonical_name, owner_user_id, source, verification_status)
    VALUES (trim(p_name), auth.uid(), 'user_provided', 'unverified')
    RETURNING id INTO v_food_id;
  ELSE
    UPDATE public.foods
    SET canonical_name = trim(p_name)
    WHERE id = p_food_id AND owner_user_id = auth.uid()
    RETURNING id INTO v_food_id;
    IF v_food_id IS NULL THEN RAISE EXCEPTION 'Custom food not found'; END IF;
  END IF;

  INSERT INTO public.food_nutrition_facts (
    food_id, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
    fiber_per_100g, sugar_per_100g, sodium_mg_per_100g, source, verification_status
  ) VALUES (
    v_food_id, p_calories_per_100g, p_protein_per_100g, p_carbs_per_100g, p_fat_per_100g,
    p_fiber_per_100g, p_sugar_per_100g, p_sodium_mg_per_100g, 'user_provided', 'unverified'
  ) ON CONFLICT (food_id) DO UPDATE SET
    calories_per_100g = EXCLUDED.calories_per_100g,
    protein_per_100g = EXCLUDED.protein_per_100g,
    carbs_per_100g = EXCLUDED.carbs_per_100g,
    fat_per_100g = EXCLUDED.fat_per_100g,
    fiber_per_100g = EXCLUDED.fiber_per_100g,
    sugar_per_100g = EXCLUDED.sugar_per_100g,
    sodium_mg_per_100g = EXCLUDED.sodium_mg_per_100g,
    source = 'user_provided', verification_status = 'unverified';

  DELETE FROM public.food_servings WHERE food_id = v_food_id;
  INSERT INTO public.food_servings (food_id, name, unit, grams, is_default)
  SELECT v_food_id, trim(s.name), trim(s.unit), s.grams, coalesce(s.is_default, false)
  FROM jsonb_to_recordset(p_servings) AS s(name TEXT, unit TEXT, grams NUMERIC, is_default BOOLEAN);

  RETURN v_food_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_recipe(
  p_recipe_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_servings NUMERIC,
  p_ingredients JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_recipe_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF char_length(trim(coalesce(p_name, ''))) = 0 OR p_servings <= 0 THEN RAISE EXCEPTION 'Invalid recipe'; END IF;
  IF jsonb_typeof(p_ingredients) <> 'array' OR jsonb_array_length(p_ingredients) = 0 THEN RAISE EXCEPTION 'At least one ingredient is required'; END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_ingredients) AS i(food_id UUID, serving_id UUID, quantity NUMERIC, unit TEXT, grams NUMERIC)
    LEFT JOIN public.foods f ON f.id = i.food_id
    LEFT JOIN public.food_servings s ON s.id = i.serving_id AND s.food_id = i.food_id
    WHERE f.id IS NULL OR (f.owner_user_id IS NOT NULL AND f.owner_user_id <> auth.uid())
      OR (i.serving_id IS NOT NULL AND s.id IS NULL) OR i.quantity <= 0 OR i.grams <= 0
      OR char_length(trim(coalesce(i.unit, ''))) = 0
  ) THEN RAISE EXCEPTION 'Invalid recipe ingredient'; END IF;

  IF p_recipe_id IS NULL THEN
    INSERT INTO public.recipes (user_id, name, description, servings)
    VALUES (auth.uid(), trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_servings)
    RETURNING id INTO v_recipe_id;
  ELSE
    UPDATE public.recipes SET name = trim(p_name), description = nullif(trim(coalesce(p_description, '')), ''), servings = p_servings
    WHERE id = p_recipe_id AND user_id = auth.uid() RETURNING id INTO v_recipe_id;
    IF v_recipe_id IS NULL THEN RAISE EXCEPTION 'Recipe not found'; END IF;
  END IF;

  DELETE FROM public.recipe_ingredients WHERE recipe_id = v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, food_id, serving_id, quantity, unit, grams)
  SELECT v_recipe_id, i.food_id, i.serving_id, i.quantity, trim(i.unit), i.grams
  FROM jsonb_to_recordset(p_ingredients) AS i(food_id UUID, serving_id UUID, quantity NUMERIC, unit TEXT, grams NUMERIC);

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_custom_food(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_custom_food(UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.upsert_recipe(UUID, TEXT, TEXT, NUMERIC, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_recipe(UUID, TEXT, TEXT, NUMERIC, JSONB) TO authenticated;
