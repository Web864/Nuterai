-- JSON keeps optional user-provided nutrients nullable in generated RPC types.
CREATE OR REPLACE FUNCTION public.create_custom_food_json(
  p_name TEXT,
  p_nutrition JSONB,
  p_servings JSONB
) RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.upsert_custom_food(
    NULL,
    p_name,
    (p_nutrition->>'calories_per_100g')::NUMERIC,
    (p_nutrition->>'protein_per_100g')::NUMERIC,
    (p_nutrition->>'carbs_per_100g')::NUMERIC,
    (p_nutrition->>'fat_per_100g')::NUMERIC,
    (p_nutrition->>'fiber_per_100g')::NUMERIC,
    (p_nutrition->>'sugar_per_100g')::NUMERIC,
    (p_nutrition->>'sodium_mg_per_100g')::NUMERIC,
    p_servings
  );
$$;

CREATE OR REPLACE FUNCTION public.update_custom_food_json(
  p_food_id UUID,
  p_name TEXT,
  p_nutrition JSONB,
  p_servings JSONB
) RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT public.upsert_custom_food(
    p_food_id,
    p_name,
    (p_nutrition->>'calories_per_100g')::NUMERIC,
    (p_nutrition->>'protein_per_100g')::NUMERIC,
    (p_nutrition->>'carbs_per_100g')::NUMERIC,
    (p_nutrition->>'fat_per_100g')::NUMERIC,
    (p_nutrition->>'fiber_per_100g')::NUMERIC,
    (p_nutrition->>'sugar_per_100g')::NUMERIC,
    (p_nutrition->>'sodium_mg_per_100g')::NUMERIC,
    p_servings
  );
$$;

REVOKE ALL ON FUNCTION public.create_custom_food_json(TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_custom_food_json(TEXT, JSONB, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.update_custom_food_json(UUID, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_custom_food_json(UUID, TEXT, JSONB, JSONB) TO authenticated;
