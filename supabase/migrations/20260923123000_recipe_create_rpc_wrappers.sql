-- Generated Supabase RPC types model UUID arguments as strings. Separate
-- create wrappers avoid client-side null casts while retaining atomic upserts.
CREATE OR REPLACE FUNCTION public.create_custom_food(
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
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.upsert_custom_food(
    NULL, p_name, p_calories_per_100g, p_protein_per_100g, p_carbs_per_100g,
    p_fat_per_100g, p_fiber_per_100g, p_sugar_per_100g, p_sodium_mg_per_100g, p_servings
  );
$$;

CREATE OR REPLACE FUNCTION public.create_recipe(
  p_name TEXT,
  p_description TEXT,
  p_servings NUMERIC,
  p_ingredients JSONB
) RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.upsert_recipe(NULL, p_name, p_description, p_servings, p_ingredients);
$$;

REVOKE ALL ON FUNCTION public.create_custom_food(TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_custom_food(TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.create_recipe(TEXT, TEXT, NUMERIC, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_recipe(TEXT, TEXT, NUMERIC, JSONB) TO authenticated;
