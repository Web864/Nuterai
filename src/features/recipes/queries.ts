import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Recipe = Tables<"recipes">;
export type RecipeIngredient = Tables<"recipe_ingredients">;
export type RecipeFood = Pick<Tables<"foods">, "id" | "canonical_name" | "owner_user_id">;
export type RecipeFoodData = {
  food: RecipeFood;
  facts: Tables<"food_nutrition_facts"> | null;
  servings: Tables<"food_servings">[];
};
export type RecipeDetail = {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  foods: RecipeFoodData[];
};

export const recipesQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["recipes", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Recipe[]> => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const recipeDetailQueryOptions = (recipeId: string | undefined) =>
  queryOptions({
    queryKey: ["recipe", recipeId],
    enabled: Boolean(recipeId),
    queryFn: async (): Promise<RecipeDetail> => {
      if (!recipeId) throw new Error("Recipe is required.");
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", recipeId)
        .single();
      if (recipeError) throw recipeError;
      const { data: ingredients, error: ingredientError } = await supabase
        .from("recipe_ingredients")
        .select("*")
        .eq("recipe_id", recipeId);
      if (ingredientError) throw ingredientError;
      const foodIds = [...new Set((ingredients ?? []).map((ingredient) => ingredient.food_id))];
      const [foodsResult, factsResult, servingsResult] = await Promise.all([
        supabase.from("foods").select("id, canonical_name, owner_user_id").in("id", foodIds),
        supabase.from("food_nutrition_facts").select("*").in("food_id", foodIds),
        supabase.from("food_servings").select("*").in("food_id", foodIds),
      ]);
      if (foodsResult.error || factsResult.error || servingsResult.error) {
        throw foodsResult.error ?? factsResult.error ?? servingsResult.error;
      }
      return {
        recipe,
        ingredients: ingredients ?? [],
        foods: (foodsResult.data ?? []).map((food) => ({
          food,
          facts: (factsResult.data ?? []).find((fact) => fact.food_id === food.id) ?? null,
          servings: (servingsResult.data ?? []).filter((serving) => serving.food_id === food.id),
        })),
      };
    },
  });

export async function searchRecipeFoods(query: string): Promise<RecipeFoodData[]> {
  const term = query.trim();
  if (term.length < 2) return [];
  const [foodsResult, aliasesResult] = await Promise.all([
    supabase
      .from("foods")
      .select("id, canonical_name, owner_user_id")
      .ilike("canonical_name", `%${term}%`)
      .limit(12),
    supabase.from("food_aliases").select("food_id, alias").ilike("alias", `%${term}%`).limit(12),
  ]);
  if (foodsResult.error || aliasesResult.error) throw foodsResult.error ?? aliasesResult.error;
  const foodIds = new Set((foodsResult.data ?? []).map((food) => food.id));
  for (const alias of aliasesResult.data ?? []) foodIds.add(alias.food_id);
  if (!foodIds.size) return [];
  const ids = [...foodIds];
  const [allFoods, factsResult, servingsResult] = await Promise.all([
    supabase.from("foods").select("id, canonical_name, owner_user_id").in("id", ids),
    supabase.from("food_nutrition_facts").select("*").in("food_id", ids),
    supabase.from("food_servings").select("*").in("food_id", ids),
  ]);
  if (allFoods.error || factsResult.error || servingsResult.error) {
    throw allFoods.error ?? factsResult.error ?? servingsResult.error;
  }
  return (allFoods.data ?? []).map((food) => ({
    food,
    facts: (factsResult.data ?? []).find((fact) => fact.food_id === food.id) ?? null,
    servings: (servingsResult.data ?? []).filter((serving) => serving.food_id === food.id),
  }));
}

export function useDeleteRecipe(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await supabase.from("recipes").delete().eq("id", recipeId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes", userId] }),
  });
}
