import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { profileQueryOptions, goalsQueryOptions } from "@/features/goals/queries";
import {
  mealsTodayQueryOptions,
  waterTodayQueryOptions,
  sumMealTotals,
  sumWater,
  todayISO,
} from "@/features/logging/queries";
import { Route as AuthedRoute } from "./route";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Apple,
  Award,
  Calendar,
  Droplets,
  Dumbbell,
  Flame,
  Leaf,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { userId, user } = AuthedRoute.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const profile = useQuery(profileQueryOptions(userId));
  const goals = useQuery(goalsQueryOptions(userId));
  const today = useMemo(() => todayISO(), []);
  const meals = useQuery(mealsTodayQueryOptions(userId, today));
  const water = useQuery(waterTodayQueryOptions(userId, today));

  const totals = useMemo(() => sumMealTotals(meals.data ?? []), [meals.data]);
  const waterMl = useMemo(() => sumWater(water.data ?? []), [water.data]);

  const needsOnboarding = profile.data && profile.data.onboarding_completed === false;

  if (needsOnboarding) {
    navigate({ to: "/onboarding", replace: true });
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName =
    profile.data?.display_name?.split(" ")[0] ||
    profile.data?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  const g = goals.data;

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onSignOut={handleSignOut} name={firstName} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-1 font-display text-4xl text-foreground sm:text-5xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Here's your personalized plan for today.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-full">
            <Link to="/log">
              <Plus className="mr-2 h-4 w-4" />
              Log now
            </Link>
          </Button>
        </header>

        {g ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Flame className="h-5 w-5" />}
                label="Calories today"
                value={Math.round(totals.calories)}
                target={g.daily_calorie_target ?? 0}
                unit="kcal"
                accent="bg-gradient-accent"
              />
              <StatCard
                icon={<Apple className="h-5 w-5" />}
                label="Protein"
                value={Math.round(totals.protein)}
                target={g.protein_g ?? 0}
                unit="g"
              />
              <StatCard
                icon={<Utensils className="h-5 w-5" />}
                label="Carbs"
                value={Math.round(totals.carbs)}
                target={g.carbs_g ?? 0}
                unit="g"
              />
              <StatCard
                icon={<Droplets className="h-5 w-5" />}
                label="Water"
                value={waterMl}
                target={g.water_target_ml ?? 0}
                unit="ml"
              />
            </section>

            <section className="mt-8 grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2 rounded-3xl border-border/60 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-display text-xl">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Today's macros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <MacroRow label="Protein" value={totals.protein} target={g.protein_g ?? 0} unit="g" />
                  <MacroRow label="Carbohydrates" value={totals.carbs} target={g.carbs_g ?? 0} unit="g" />
                  <MacroRow label="Healthy fats" value={totals.fat} target={g.fat_g ?? 0} unit="g" />
                  <MacroRow label="Fiber" value={totals.fiber} target={g.fiber_g ?? 0} unit="g" />
                  <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
                    <p className="font-medium text-foreground">Your maintenance is {g.tdee_kcal} kcal.</p>
                    <p className="mt-1 text-muted-foreground">
                      To reach your goal, aim for <strong className="text-foreground">{g.daily_calorie_target} kcal/day</strong>.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Link to="/log" className="block">
                  <FeatureCard
                    icon={<Utensils className="h-5 w-5" />}
                    title="Log a meal"
                    description="AI-powered food logging"
                  />
                </Link>
                <Link to="/log" className="block">
                  <FeatureCard
                    icon={<Droplets className="h-5 w-5" />}
                    title="Log water"
                    description="Stay hydrated all day"
                  />
                </Link>
                <FeatureCard
                  icon={<Dumbbell className="h-5 w-5" />}
                  title="Today's workout"
                  description="Personalized to your goal"
                  soon
                />
                <FeatureCard
                  icon={<Moon className="h-5 w-5" />}
                  title="Sleep & recovery"
                  description="Track and optimize"
                  soon
                />
              </div>
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2">
              <Card className="rounded-3xl border-border/60 shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <Award className="h-5 w-5 text-accent" />
                    Your plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Goal" value={humanizeGoal(g.fitness_goal)} />
                  <Row label="Activity level" value={humanizeActivity(g.activity_level)} />
                  <Row label="Diet" value={humanizeDiet(g.diet_preference)} />
                  <Row label="Basal metabolic rate" value={`${g.bmr_kcal ?? 0} kcal`} />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-border/60 shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <Calendar className="h-5 w-5 text-accent" />
                    Weekly summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your weekly nutrition, workouts, sleep and mood trends will appear here once you start logging.
                  </p>
                  <Button asChild variant="outline" className="mt-4 rounded-full">
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Adjust goals
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </>
        ) : (
          <Card className="rounded-3xl border-dashed border-border/70 bg-card/50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
              <Activity className="h-6 w-6 text-accent" />
            </div>
            <h2 className="mt-4 font-display text-xl">Finish setting up your plan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete your health profile so NutriAI can build your personalized plan.
            </p>
            <Button asChild size="lg" className="mt-6 rounded-full">
              <Link to="/onboarding">Continue onboarding</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}

function TopBar({ onSignOut, name }: { onSignOut: () => void; name: string }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg tracking-tight">NutriAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Settings</span>
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onSignOut} aria-label={`Sign ${name} out`}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Sign out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  target,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  target?: number;
  unit: string;
  accent?: string;
}) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <Card className="rounded-3xl border-border/60 shadow-soft transition-organic hover:shadow-elevated">
      <CardContent className="p-5">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${accent ?? "bg-secondary text-primary"}`}>
          {accent ? <span className="text-primary-foreground">{icon}</span> : icon}
        </div>
        <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl text-foreground">
          {value.toLocaleString()}
          {target ? (
            <span className="ml-1 text-sm font-sans font-normal text-muted-foreground">
              / {target.toLocaleString()} {unit}
            </span>
          ) : (
            <span className="ml-1 text-sm font-sans font-normal text-muted-foreground">{unit}</span>
          )}
        </p>
        {target ? <Progress value={pct} className="mt-3 h-1.5" /> : null}
      </CardContent>
    </Card>
  );
}

function MacroRow({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          <strong className="text-foreground">{Math.round(value)}</strong> / {target}
          {unit}
        </span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function FeatureCard({ icon, title, description, soon }: { icon: React.ReactNode; title: string; description: string; soon?: boolean }) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-soft transition-organic hover:shadow-elevated">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        {soon && (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-foreground">
            Soon
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function humanizeGoal(g: string | null): string {
  return (
    {
      lose_weight: "Lose weight",
      maintain: "Maintain weight",
      gain_weight: "Gain weight",
      build_muscle: "Build muscle",
      improve_health: "Improve health",
      boost_energy: "Boost energy",
    }[g ?? ""] ?? "—"
  );
}
function humanizeActivity(a: string | null): string {
  return (
    {
      sedentary: "Sedentary",
      light: "Lightly active",
      moderate: "Moderately active",
      active: "Active",
      very_active: "Very active",
    }[a ?? ""] ?? "—"
  );
}
function humanizeDiet(d: string | null): string {
  return (
    {
      omnivore: "Omnivore",
      vegetarian: "Vegetarian",
      vegan: "Vegan",
      pescatarian: "Pescatarian",
      halal: "Halal",
      kosher: "Kosher",
      keto: "Keto",
      mediterranean: "Mediterranean",
      low_carb: "Low carb",
      high_protein: "High protein",
    }[d ?? ""] ?? "—"
  );
}
