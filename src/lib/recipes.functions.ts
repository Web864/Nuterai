import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const NutritionSchema = z.object({
  calories_per_100g: z.number().finite().min(0),
  protein_per_100g: z.number().finite().min(0),
  carbs_per_100g: z.number().finite().min(0),
  fat_per_100g: z.number().finite().min(0),
  fiber_per_100g: z.number().finite().min(0),
  sugar_per_100g: z.number().finite().min(0).nullable(),
  sodium_mg_per_100g: z.number().finite().min(0).nullable(),
});

const ServingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(80),
  grams: z.number().finite().positive(),
  is_default: z.boolean().default(false),
});

const CustomFoodSchema = z.object({
  foodId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  nutrition: NutritionSchema,
  servings: z.array(ServingSchema).min(1),
});

const RecipeIngredientSchema = z.object({
  foodId: z.string().uuid(),
  servingId: z.string().uuid().nullable(),
  quantity: z.number().finite().positive(),
  unit: z.string().trim().min(1).max(80),
  grams: z.number().finite().positive(),
});

const RecipeSchema = z.object({
  recipeId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2_000).nullable(),
  servings: z.number().finite().positive(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
});

export const saveCustomFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CustomFoodSchema.parse(input))
  .handler(async ({ data, context }): Promise<string> => {
    const args = {
      p_name: data.name,
      p_nutrition: data.nutrition,
      p_servings: data.servings,
    };
    const result = data.foodId
      ? await context.supabase.rpc("update_custom_food_json", { ...args, p_food_id: data.foodId })
      : await context.supabase.rpc("create_custom_food_json", args);
    if (result.error || !result.data) throw new Error("Unable to save your custom food.");
    return result.data;
  });

export const saveRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RecipeSchema.parse(input))
  .handler(async ({ data, context }): Promise<string> => {
    const args = {
      p_name: data.name,
      p_description: data.description ?? "",
      p_servings: data.servings,
      p_ingredients: data.ingredients.map((ingredient) => ({
        food_id: ingredient.foodId,
        serving_id: ingredient.servingId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        grams: ingredient.grams,
      })),
    };
    const result = data.recipeId
      ? await context.supabase.rpc("upsert_recipe", { ...args, p_recipe_id: data.recipeId })
      : await context.supabase.rpc("create_recipe", args);
    if (result.error || !result.data) throw new Error("Unable to save your recipe.");
    return result.data;
  });

export type CustomFoodInput = z.infer<typeof CustomFoodSchema>;
export type RecipeInput = z.infer<typeof RecipeSchema>;
