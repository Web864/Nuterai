import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ChefHat, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Route as AuthedRoute } from "./route";
import {
  recipeDetailQueryOptions,
  recipesQueryOptions,
  searchRecipeFoods,
  useDeleteRecipe,
  type RecipeFoodData,
} from "@/features/recipes/queries";
import { calculateRecipeNutrition } from "@/lib/recipe-nutrition";
import { saveRecipe } from "@/lib/recipes.functions";

export const Route = createFileRoute("/_authenticated/recipes")({
  // Recipe data is retained, but the production recipe UI is intentionally dormant.
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: RecipesPage,
});

type DraftIngredient = { data: RecipeFoodData; servingId: string | null; quantity: number };

function RecipesPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const queryClient = useQueryClient();
  const recipes = useQuery(recipesQueryOptions(userId));
  const [selectedId, setSelectedId] = useState<string>();
  const detail = useQuery(recipeDetailQueryOptions(selectedId));
  const removeRecipe = useDeleteRecipe(userId);
  const save = useServerFn(saveRecipe);
  const [recipeId, setRecipeId] = useState<string>();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<RecipeFoodData[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const nutrition = useMemo(
    () =>
      calculateRecipeNutrition(
        ingredients.map((ingredient) => ({
          ingredientId: ingredient.data.food.id,
          food: ingredient.data.food,
          facts: ingredient.data.facts,
          grams: (selectedServing(ingredient)?.grams ?? 0) * ingredient.quantity,
        })),
        Number(servings),
      ),
    [ingredients, servings],
  );

  function resetEditor() {
    setRecipeId(undefined);
    setName("");
    setServings("1");
    setIngredients([]);
    setResults([]);
  }

  function editSelected() {
    if (!detail.data) return;
    setRecipeId(detail.data.recipe.id);
    setName(detail.data.recipe.name);
    setServings(String(detail.data.recipe.servings));
    setIngredients(
      detail.data.ingredients.flatMap((ingredient) => {
        const data = detail.data?.foods.find((food) => food.food.id === ingredient.food_id);
        if (!data) return [];
        return [{ data, servingId: ingredient.serving_id, quantity: ingredient.quantity }];
      }),
    );
  }

  async function findFoods() {
    setSearching(true);
    try {
      setResults(await searchRecipeFoods(search));
    } catch {
      toast.error("Unable to search foods right now.");
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    if (!name.trim() || !ingredients.length || !nutrition.ok || saving) {
      toast.error(nutrition.ok ? "Add a name and ingredient." : "Resolve every ingredient first.");
      return;
    }
    setSaving(true);
    try {
      const id = await save({
        data: {
          recipeId,
          name: name.trim(),
          description: null,
          servings: Number(servings),
          ingredients: ingredients.map((ingredient) => ({
            foodId: ingredient.data.food.id,
            servingId: ingredient.servingId,
            quantity: ingredient.quantity,
            unit: selectedServing(ingredient)?.unit ?? "g",
            grams: (selectedServing(ingredient)?.grams ?? 0) * ingredient.quantity,
          })),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["recipes", userId] });
      setSelectedId(id);
      resetEditor();
      toast.success("Recipe saved.");
    } catch {
      toast.error("Unable to save this recipe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Recipes</h1>
          <p className="text-sm text-muted-foreground">
            Personal recipes with deterministic nutrition.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/log">Log meals</Link>
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Your recipes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recipes.isLoading && (
              <p className="text-sm text-muted-foreground">Loading recipes...</p>
            )}
            {!recipes.isLoading && !recipes.data?.length && (
              <p className="text-sm text-muted-foreground">No recipes yet.</p>
            )}
            {recipes.data?.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/50 p-3"
              >
                <button className="min-w-0 text-left" onClick={() => setSelectedId(recipe.id)}>
                  <p className="truncate font-medium">{recipe.name}</p>
                  <p className="text-xs text-muted-foreground">{recipe.servings} servings</p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${recipe.name}`}
                  disabled={removeRecipe.isPending}
                  onClick={() =>
                    removeRecipe.mutate(recipe.id, {
                      onSuccess: () => {
                        if (selectedId === recipe.id) setSelectedId(undefined);
                        toast.success("Recipe deleted.");
                      },
                      onError: () => toast.error("Unable to delete this recipe."),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {detail.data && (
              <Button variant="outline" className="w-full rounded-full" onClick={editSelected}>
                Edit selected recipe
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>{recipeId ? "Edit recipe" : "Create recipe"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="recipe-name">Recipe name</Label>
                <Input
                  id="recipe-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recipe-servings">Recipe servings</Label>
                <Input
                  id="recipe-servings"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={servings}
                  onChange={(event) => setServings(event.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                aria-label="Search foods"
                placeholder="Search foods"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button
                type="button"
                size="icon"
                onClick={findFoods}
                disabled={searching || search.trim().length < 2}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            {results.map((result) => (
              <button
                key={result.food.id}
                className="flex w-full items-center justify-between rounded-xl border p-3 text-left"
                onClick={() => {
                  setIngredients((current) => [
                    ...current,
                    {
                      data: result,
                      servingId:
                        result.servings.find((serving) => serving.is_default)?.id ??
                        result.servings[0]?.id ??
                        null,
                      quantity: 1,
                    },
                  ]);
                  setResults([]);
                }}
              >
                <span>
                  {result.food.canonical_name}
                  {result.food.owner_user_id ? " (Custom)" : ""}
                </span>
                <Plus className="h-4 w-4" />
              </button>
            ))}
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <IngredientEditor
                  key={`${ingredient.data.food.id}-${index}`}
                  ingredient={ingredient}
                  onChange={(next) =>
                    setIngredients((current) =>
                      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                    )
                  }
                  onRemove={() =>
                    setIngredients((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                />
              ))}
            </div>
            {nutrition.ok ? (
              <NutritionSummary nutrition={nutrition} servings={Number(servings)} />
            ) : ingredients.length > 0 ? (
              <p className="text-sm text-destructive">
                One or more ingredients need nutrition facts and a valid serving.
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                className="rounded-full"
                disabled={saving || !nutrition.ok || !ingredients.length}
                onClick={submit}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save recipe
              </Button>
              {recipeId && (
                <Button variant="outline" className="rounded-full" onClick={resetEditor}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function selectedServing(ingredient: DraftIngredient) {
  return ingredient.data.servings.find((serving) => serving.id === ingredient.servingId);
}
function IngredientEditor({
  ingredient,
  onChange,
  onRemove,
}: {
  ingredient: DraftIngredient;
  onChange: (ingredient: DraftIngredient) => void;
  onRemove: () => void;
}) {
  const serving = selectedServing(ingredient);
  return (
    <div className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_140px_100px_auto]">
      <p className="self-center text-sm font-medium">{ingredient.data.food.canonical_name}</p>
      <Select
        value={ingredient.servingId ?? undefined}
        onValueChange={(servingId) => onChange({ ...ingredient, servingId })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Serving" />
        </SelectTrigger>
        <SelectContent>
          {ingredient.data.servings.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name} ({option.grams}g)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        aria-label={`Quantity for ${ingredient.data.food.canonical_name}`}
        type="number"
        min="0.01"
        step="0.25"
        value={ingredient.quantity}
        onChange={(event) => onChange({ ...ingredient, quantity: Number(event.target.value) || 0 })}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${ingredient.data.food.canonical_name}`}
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {!ingredient.data.facts && (
        <p className="text-xs text-destructive sm:col-span-4">
          Nutrition facts are unavailable for this food.
        </p>
      )}
      {!serving && (
        <p className="text-xs text-destructive sm:col-span-4">Choose a valid serving.</p>
      )}
    </div>
  );
}
function NutritionSummary({
  nutrition,
  servings,
}: {
  nutrition: Extract<ReturnType<typeof calculateRecipeNutrition>, { ok: true }>;
  servings: number;
}) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3 text-sm">
      <p className="font-medium">Total: {Math.round(nutrition.total.calories_kcal)} kcal</p>
      <p className="text-muted-foreground">
        Per serving ({servings}): {Math.round(nutrition.perServing.calories_kcal)} kcal · P{" "}
        {nutrition.perServing.protein_g.toFixed(1)}g · C {nutrition.perServing.carbs_g.toFixed(1)}g
        · F {nutrition.perServing.fat_g.toFixed(1)}g · Fiber{" "}
        {nutrition.perServing.fiber_g.toFixed(1)}g
      </p>
      {nutrition.perServing.sugar_g !== null && (
        <p className="text-xs text-muted-foreground">
          Sugar {nutrition.perServing.sugar_g.toFixed(1)}g
        </p>
      )}
      {nutrition.perServing.sodium_mg !== null && (
        <p className="text-xs text-muted-foreground">
          Sodium {nutrition.perServing.sodium_mg.toFixed(0)}mg
        </p>
      )}
    </div>
  );
}
