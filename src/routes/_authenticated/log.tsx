import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { useGamification } from "@/features/gamification/useGamification";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Droplets,
  Flame,
  Leaf,
  Loader2,
  PenLine,
  Plus,
  Scale,
  Scan,
  Trash2,
  Utensils,
} from "lucide-react";

import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { goalsQueryOptions } from "@/features/goals/queries";
import {
  mealsTodayQueryOptions,
  sumMealTotals,
  sumWater,
  todayISO,
  useAddMeal,
  useAddWater,
  useAddWeight,
  useDeleteMeal,
  useDeleteWater,
  useDeleteWeight,
  waterTodayQueryOptions,
  weightHistoryQueryOptions,
} from "@/features/logging/queries";
import { analyzeMeal, type AnalyzedMeal } from "@/lib/ai-meal.functions";
import { describeAnalysisError } from "@/lib/utils";
import { PhotoTab, BarcodeTab } from "@/features/scan/FoodScan";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [{ title: "Log — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  component: LogPage,
});

function LogPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const navigate = useNavigate();
  const date = useMemo(() => todayISO(), []);
  const { track } = useGamification(userId);

  const meals = useQuery(mealsTodayQueryOptions(userId, date));
  const water = useQuery(waterTodayQueryOptions(userId, date));
  const weight = useQuery(weightHistoryQueryOptions(userId));
  const goals = useQuery(goalsQueryOptions(userId));

  const totals = useMemo(() => sumMealTotals(meals.data ?? []), [meals.data]);
  const waterMl = useMemo(() => sumWater(water.data ?? []), [water.data]);

  const g = goals.data;

  // Daily bonus when the calorie target is reached (deduped once per day).
  const calorieTarget = g?.daily_calorie_target ?? 0;
  useEffect(() => {
    if (calorieTarget > 0 && totals.calories >= calorieTarget * 0.9) {
      void track({ type: "calorie_target_hit" });
    }
  }, [calorieTarget, totals.calories, track]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Back</span>
          </Button>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <p className="font-display text-base leading-tight">Today's log</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Today totals */}
        <section className="grid gap-3 sm:grid-cols-3">
          <TotalCard
            icon={<Flame className="h-5 w-5" />}
            label="Calories"
            value={Math.round(totals.calories)}
            target={g?.daily_calorie_target ?? 0}
            unit="kcal"
          />
          <TotalCard
            icon={<Droplets className="h-5 w-5" />}
            label="Water"
            value={waterMl}
            target={g?.water_target_ml ?? 0}
            unit="ml"
          />
          <TotalCard
            icon={<Utensils className="h-5 w-5" />}
            label="Protein"
            value={Math.round(totals.protein)}
            target={g?.protein_g ?? 0}
            unit="g"
          />
        </section>

        <Tabs defaultValue="meal" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 rounded-full bg-secondary p-1">
            <TabsTrigger value="meal" className="rounded-full">
              <Utensils className="mr-2 h-4 w-4" /> Meal
            </TabsTrigger>
            <TabsTrigger value="water" className="rounded-full">
              <Droplets className="mr-2 h-4 w-4" /> Water
            </TabsTrigger>
            <TabsTrigger value="weight" className="rounded-full">
              <Scale className="mr-2 h-4 w-4" /> Weight
            </TabsTrigger>
          </TabsList>

          <TabsContent value="meal" className="mt-4 space-y-4">
            <MealLogger userId={userId} />
            <MealList userId={userId} date={date} />
          </TabsContent>

          <TabsContent value="water" className="mt-4 space-y-4">
            <WaterLogger userId={userId} totalMl={waterMl} targetMl={g?.water_target_ml ?? 2500} />
            <WaterList userId={userId} date={date} />
          </TabsContent>

          <TabsContent value="weight" className="mt-4 space-y-4">
            <WeightLogger
              userId={userId}
              lastKg={weight.data?.[0] ? Number(weight.data[0].weight_kg) : undefined}
              targetKg={g?.target_weight_kg ? Number(g.target_weight_kg) : undefined}
            />
            <WeightList userId={userId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Totals ---------------- */

function TotalCard({
  icon,
  label,
  value,
  target,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-primary">
            {icon}
          </span>
          <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
        <p className="mt-2 font-display text-2xl text-foreground">
          {value.toLocaleString()}
          <span className="ml-1 text-xs font-sans text-muted-foreground">
            / {target.toLocaleString()} {unit}
          </span>
        </p>
        <Progress value={pct} className="mt-2 h-1.5" />
      </CardContent>
    </Card>
  );
}

/* ---------------- Meal logging ---------------- */

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
] as const;

function defaultMealType(): "breakfast" | "lunch" | "dinner" | "snack" {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20) return "dinner";
  return "snack";
}

function MealLogger({ userId }: { userId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Utensils className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg">Log a meal</h2>
      </div>
      <Tabs defaultValue="text">
        <TabsList className="grid w-full grid-cols-3 rounded-full bg-secondary p-1">
          <TabsTrigger value="text" className="rounded-full">
            <PenLine className="mr-1.5 h-3.5 w-3.5" /> Text
          </TabsTrigger>
          <TabsTrigger value="image" className="rounded-full">
            <Camera className="mr-1.5 h-3.5 w-3.5" /> Image
          </TabsTrigger>
          <TabsTrigger value="barcode" className="rounded-full">
            <Scan className="mr-1.5 h-3.5 w-3.5" /> Barcode
          </TabsTrigger>
        </TabsList>
        <TabsContent value="text" className="mt-4">
          <TextMealTab userId={userId} />
        </TabsContent>
        <TabsContent value="image" className="mt-4">
          <PhotoTab userId={userId} />
        </TabsContent>
        <TabsContent value="barcode" className="mt-4">
          <BarcodeTab userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Free-text meal description → structured estimate → save. No "AI" framing
 * in the UI: this is plain meal logging from the user's point of view, even
 * though the estimate is computed by the same AI model as the other tabs. */
function TextMealTab({ userId }: { userId: string }) {
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(
    defaultMealType(),
  );
  const [analysis, setAnalysis] = useState<AnalyzedMeal | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const runAnalyze = useServerFn(analyzeMeal);
  const addMeal = useAddMeal(userId);
  const { track } = useGamification(userId);
  const qc = useQueryClient();

  async function handleLogMeal() {
    if (description.trim().length < 2) {
      toast.error("Describe what you ate first.");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await runAnalyze({ data: { description: description.trim() } });
      setAnalysis(result);
    } catch (err) {
      toast.error(describeAnalysisError(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveAll() {
    if (!analysis) return;
    try {
      // Save every detected item in parallel — the previous sequential
      // await-in-a-loop made a multi-item meal (e.g. "eggs, toast, coffee")
      // take 3x as long to save as it needed to.
      await Promise.all(
        analysis.items.map((item) =>
          addMeal.mutateAsync({
            meal_type: mealType,
            name: item.name,
            description: description.trim(),
            serving_qty: item.serving_qty,
            serving_unit: item.serving_unit,
            calories_kcal: item.calories_kcal,
            protein_g: item.protein_g,
            carbs_g: item.carbs_g,
            fat_g: item.fat_g,
            fiber_g: item.fiber_g,
            source: "ai_text",
            ai_model: (analysis as AnalyzedMeal & { model?: string }).model ?? null,
            ai_confidence: analysis.confidence,
            ai_raw: JSON.parse(JSON.stringify(analysis)),
          }),
        ),
      );
      toast.success(
        `Logged ${analysis.items.length} item${analysis.items.length === 1 ? "" : "s"}.`,
      );
      void track({ type: "meal_logged", name: analysis.items[0]?.name });
      setDescription("");
      setAnalysis(null);
      qc.invalidateQueries({ queryKey: ["meals", userId] });
    } catch (err) {
      toast.error(describeAnalysisError(err));
    }
  }

  const totalKcal = analysis
    ? Math.round(analysis.items.reduce((a, i) => a + i.calories_kcal * i.serving_qty, 0))
    : 0;

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <div className="space-y-1.5">
            <Label htmlFor="meal-desc">What did you eat?</Label>
            <Textarea
              id="meal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grilled chicken salad with olive oil and a black coffee"
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Meal</Label>
            <Select value={mealType} onValueChange={(v) => setMealType(v as typeof mealType)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleLogMeal}
            disabled={analyzing || description.trim().length < 2}
            className="rounded-full"
          >
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {analyzing ? "Logging…" : "Log meal"}
          </Button>
          {analysis && (
            <Button variant="outline" className="rounded-full" onClick={() => setAnalysis(null)}>
              Discard
            </Button>
          )}
        </div>

        {analysis && (
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated</p>
                <p className="font-display text-xl text-foreground">{totalKcal} kcal</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {Math.round(analysis.confidence * 100)}% confidence
              </span>
            </div>
            <ul className="space-y-2">
              {analysis.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-xl bg-background/60 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.serving_qty} {item.serving_unit} · P {item.protein_g.toFixed(0)}g · C{" "}
                      {item.carbs_g.toFixed(0)}g · F {item.fat_g.toFixed(0)}g
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-medium text-foreground">
                    {Math.round(item.calories_kcal * item.serving_qty)} kcal
                  </span>
                </li>
              ))}
            </ul>
            {analysis.notes && (
              <p className="mt-3 text-xs italic text-muted-foreground">{analysis.notes}</p>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={addMeal.isPending}
              className="mt-4 w-full rounded-full"
              size="lg"
            >
              {addMeal.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Save to today's log
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MealList({ userId, date }: { userId: string; date: string }) {
  const meals = useQuery(mealsTodayQueryOptions(userId, date));
  const del = useDeleteMeal(userId);

  const mealRows = meals.data;
  const grouped = useMemo(() => {
    const map: Record<string, typeof mealRows> = {};
    for (const m of mealRows ?? []) {
      (map[m.meal_type] ||= []).push(m);
    }
    return map;
  }, [mealRows]);

  if (!meals.data || meals.data.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/50">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Nothing logged yet today. Describe your meal above to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {MEAL_TYPES.map((mt) => {
        const items = grouped[mt.value];
        if (!items || items.length === 0) return null;
        const kcal = Math.round(
          items.reduce((a, m) => a + Number(m.calories_kcal) * Number(m.serving_qty ?? 1), 0),
        );
        return (
          <Card key={mt.value} className="rounded-3xl border-border/60 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display text-base">{mt.label}</CardTitle>
              <span className="text-sm text-muted-foreground">{kcal} kcal</span>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-secondary/40 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(m.serving_qty)} {m.serving_unit} · P {Number(m.protein_g).toFixed(0)}g
                      · C {Number(m.carbs_g).toFixed(0)}g · F {Number(m.fat_g).toFixed(0)}g
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {Math.round(Number(m.calories_kcal) * Number(m.serving_qty ?? 1))} kcal
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => del.mutate(m.id)}
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- Water ---------------- */

const WATER_PRESETS = [200, 250, 330, 500, 750];

function WaterLogger({
  userId,
  totalMl,
  targetMl,
}: {
  userId: string;
  totalMl: number;
  targetMl: number;
}) {
  const add = useAddWater(userId);
  const { track } = useGamification(userId);
  const [custom, setCustom] = useState("");
  const remaining = Math.max(0, targetMl - totalMl);

  function log(amount: number) {
    add.mutate(amount, {
      onSuccess: () => {
        toast.success(`+${amount}ml logged`);
        void track({ type: "water_logged", amountMl: amount });
        if (targetMl > 0 && totalMl + amount >= targetMl) {
          void track({ type: "water_goal_met" });
        }
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't log water"),
    });
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Droplets className="h-5 w-5 text-accent" />
          Water
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
          {remaining > 0 ? (
            <>
              <strong className="text-foreground">{remaining.toLocaleString()} ml</strong> to reach
              your daily goal.
            </>
          ) : (
            <span className="text-foreground">You've hit your hydration goal for today.</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {WATER_PRESETS.map((n) => (
            <Button
              key={n}
              variant="outline"
              className="rounded-full"
              onClick={() => log(n)}
              disabled={add.isPending}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {n}ml
            </Button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(custom, 10);
            if (!Number.isFinite(n) || n <= 0 || n > 5000) {
              toast.error("Enter a value between 1 and 5000 ml.");
              return;
            }
            log(n);
            setCustom("");
          }}
        >
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            placeholder="Custom (ml)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11"
          />
          <Button type="submit" className="h-11 rounded-full" disabled={add.isPending}>
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function WaterList({ userId, date }: { userId: string; date: string }) {
  const water = useQuery(waterTodayQueryOptions(userId, date));
  const del = useDeleteWater(userId);
  if (!water.data || water.data.length === 0) return null;
  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">Today's sips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {water.data.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between rounded-xl bg-secondary/40 p-3 text-sm"
          >
            <span className="text-foreground">
              {w.amount_ml} ml
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(w.logged_at).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              onClick={() => del.mutate(w.id)}
              aria-label="Remove water entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------------- Weight ---------------- */

function WeightLogger({
  userId,
  lastKg,
  targetKg,
}: {
  userId: string;
  lastKg?: number;
  targetKg?: number;
}) {
  const add = useAddWeight(userId);
  const { track } = useGamification(userId);
  const [weight, setWeight] = useState<string>(lastKg ? lastKg.toString() : "");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(weight);
    if (!Number.isFinite(n) || n < 20 || n > 500) {
      toast.error("Enter a weight between 20 and 500 kg.");
      return;
    }
    add.mutate(
      { weight_kg: n, note: note.trim() || null },
      {
        onSuccess: () => {
          toast.success("Weight logged");
          setNote("");
          void track({
            type: "weight_logged",
            weightKg: n,
            reachedTarget: !!targetKg && Math.abs(n - targetKg) <= 0.5,
          });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't log weight"),
      },
    );
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Scale className="h-5 w-5 text-accent" />
          Weight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="weight-kg">Weight (kg)</Label>
              <Input
                id="weight-kg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="20"
                max="500"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight-note">Note (optional)</Label>
              <Input
                id="weight-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Morning, after workout…"
                className="h-11"
              />
            </div>
          </div>
          <Button type="submit" className="rounded-full" disabled={add.isPending}>
            {add.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Save weight
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function WeightList({ userId }: { userId: string }) {
  const weight = useQuery(weightHistoryQueryOptions(userId));
  const del = useDeleteWeight(userId);
  if (!weight.data || weight.data.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/60 bg-card/50">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No weight entries yet. Track it weekly to see your trend.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {weight.data.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between rounded-xl bg-secondary/40 p-3 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">{Number(w.weight_kg).toFixed(1)} kg</p>
              <p className="text-xs text-muted-foreground">
                {new Date(w.logged_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {w.note ? ` · ${w.note}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              onClick={() => del.mutate(w.id)}
              aria-label="Remove weight entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* keep Link import used to satisfy no-unused rule in some builds */
void Link;
