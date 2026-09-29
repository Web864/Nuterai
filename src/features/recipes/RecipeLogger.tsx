import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { todayISO } from "@/features/logging/queries";
import { buildRecipeMealSnapshot } from "@/features/recipes/recipe-meal";
import { recipeDetailQueryOptions, recipesQueryOptions } from "@/features/recipes/queries";

export function RecipeLogger({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const recipes = useQuery(recipesQueryOptions(userId));
  const [recipeId, setRecipeId] = useState<string>();
  const detail = useQuery(recipeDetailQueryOptions(recipeId));
  const [loggedServings, setLoggedServings] = useState("1");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("lunch");
  const [saving, setSaving] = useState(false);
  const snapshot = detail.data
    ? buildRecipeMealSnapshot({
        userId,
        recipeId: detail.data.recipe.id,
        recipeName: detail.data.recipe.name,
        mealType,
        recipeServings: detail.data.recipe.servings,
        loggedServings: Number(loggedServings),
        ingredients: detail.data.ingredients.map((ingredient) => {
          const food = detail.data?.foods.find((entry) => entry.food.id === ingredient.food_id);
          return {
            ingredientId: ingredient.id,
            food: food?.food,
            facts: food?.facts,
            grams: ingredient.grams,
          };
        }),
      })
    : null;

  async function logRecipe() {
    if (!snapshot?.ok || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("meal_entries")
        .insert({ ...snapshot.meal, logged_date: todayISO() });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["meals", userId] });
      toast.success("Recipe added to your log.");
      setRecipeId(undefined);
    } catch {
      toast.error("Unable to log this recipe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="space-y-3 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-accent" />
          <h3 className="font-display text-lg">Log a recipe</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label>Recipe</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={recipes.isLoading ? "Loading recipes..." : "Choose a recipe"}
                />
              </SelectTrigger>
              <SelectContent>
                {recipes.data?.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="recipe-log-servings">Servings</Label>
            <Input
              id="recipe-log-servings"
              type="number"
              min="0.25"
              step="0.25"
              value={loggedServings}
              onChange={(event) => setLoggedServings(event.target.value)}
            />
          </div>
        </div>
        <Select value={mealType} onValueChange={(value) => setMealType(value as typeof mealType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">Breakfast</SelectItem>
            <SelectItem value="lunch">Lunch</SelectItem>
            <SelectItem value="dinner">Dinner</SelectItem>
            <SelectItem value="snack">Snack</SelectItem>
          </SelectContent>
        </Select>
        {detail.isLoading && (
          <p className="text-sm text-muted-foreground">Loading recipe nutrition...</p>
        )}
        {snapshot && !snapshot.ok && (
          <p className="text-sm text-destructive">
            This recipe has an unresolved ingredient and cannot be logged.
          </p>
        )}
        {snapshot?.ok && (
          <p className="text-sm text-muted-foreground">
            {Math.round(snapshot.nutrition.loggedQuantity.calories_kcal)} kcal · P{" "}
            {snapshot.nutrition.loggedQuantity.protein_g.toFixed(1)}g · C{" "}
            {snapshot.nutrition.loggedQuantity.carbs_g.toFixed(1)}g · F{" "}
            {snapshot.nutrition.loggedQuantity.fat_g.toFixed(1)}g
          </p>
        )}
        <Button className="rounded-full" disabled={!snapshot?.ok || saving} onClick={logRecipe}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Add recipe to log
        </Button>
      </CardContent>
    </Card>
  );
}
