import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { profileQueryOptions, goalsQueryOptions } from "@/features/goals/queries";
import { remindersQueryOptions, type Reminder } from "@/features/reminders/queries";
import { formatWhen, nextOccurrence, typeLabel } from "@/lib/reminders";
import {
  dateDaysBefore,
  mealsDateRangeQueryOptions,
  waterTodayQueryOptions,
  sumMealTotals,
  sumWater,
  todayISO,
} from "@/features/logging/queries";
import { Route as AuthedRoute } from "./route";
import { LevelCard, BadgeShelf } from "@/features/gamification/StatsWidgets";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Activity,
  Apple,
  ClipboardList,
  ArrowRight,
  Bell,
  BarChart3,
  Camera,
  Droplets,
  Dumbbell,
  Flame,
  Leaf,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Utensils,
} from "lucide-react";
import { adminWhoAmIQueryOptions } from "@/features/admin/queries";
import { summarizeNutritionWeek } from "@/features/logging/nutrition-summary";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NutriAI" },
      {
        name: "description",
        content:
          "Your NutriAI dashboard: today's calories, macros, water, workouts, and streaks in one personalized daily view.",
      },
      { property: "og:title", content: "Your NutriAI Dashboard" },
      {
        property: "og:description",
        content:
          "Track today's calories, macros, water, workouts, and streaks in your personalized NutriAI dashboard.",
      },
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
  const weekStart = useMemo(() => dateDaysBefore(today, 6), [today]);
  const weeklyMeals = useQuery(mealsDateRangeQueryOptions(userId, weekStart, today));
  const water = useQuery(waterTodayQueryOptions(userId, today));
  const reminders = useQuery(remindersQueryOptions(userId));

  const todayMeals = useMemo(
    () => (weeklyMeals.data ?? []).filter((meal) => meal.logged_date === today),
    [today, weeklyMeals.data],
  );
  const totals = useMemo(() => sumMealTotals(todayMeals), [todayMeals]);
  const weeklySummary = useMemo(
    () => summarizeNutritionWeek(weeklyMeals.data ?? [], today),
    [today, weeklyMeals.data],
  );
  const waterMl = useMemo(() => sumWater(water.data ?? []), [water.data]);

  const needsOnboarding = profile.data && profile.data.onboarding_completed === false;

  useEffect(() => {
    if (needsOnboarding) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [needsOnboarding, navigate]);

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
    <div className="dashboard-shell min-h-screen">
      <TopBar onSignOut={handleSignOut} name={firstName} />

      <main className="dashboard-main mx-auto max-w-[960px] px-4 pb-16 pt-6 sm:px-0">
        <header className="dashboard-hero dashboard-reference-hero mb-7 flex min-w-0 flex-wrap items-end justify-between gap-5">
          <div className="dashboard-hero-copy">
            <p className="dashboard-eyebrow">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-2 font-display text-4xl text-foreground sm:text-5xl">
              {greeting}, <span className="emerald-text">{firstName}</span>.
            </h1>
            <p className="mt-2 text-muted-foreground">Here's your personalized plan for today.</p>
          </div>
          <div className="dashboard-hero-art" aria-hidden="true">
            <svg viewBox="0 0 420 180" role="presentation" focusable="false">
              <defs>
                <linearGradient id="heroLeaf" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="currentColor" stopOpacity="0.08" />
                  <stop offset="0.65" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path
                d="M300 185C292 128 314 67 384 8c17 48 8 110-35 147-14 12-30 21-49 30Z"
                fill="url(#heroLeaf)"
              />
              <path
                d="M308 179C324 119 351 72 390 30"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.18"
                strokeWidth="1.5"
              />
              <path
                d="M334 134c25-20 45-28 66-29M324 153c22-5 40-3 58 5M345 111c14-17 29-27 45-34"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeWidth="1.25"
              />
            </svg>
            <span className="dashboard-mantra">
              Better
              <br />
              Food
              <br />
              <em>Brighter You</em>
            </span>
          </div>
          <Button asChild size="lg" className="dashboard-log-button rounded-xl">
            <Link to="/log">
              <Plus className="mr-2 h-4 w-4" />
              Log now
            </Link>
          </Button>
        </header>

        {g ? (
          <>
            <section className="dashboard-metrics dashboard-reference-metrics grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

            <section className="dashboard-level dashboard-reference-level mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <LevelCard userId={userId} />
              <BadgeShelf userId={userId} />
            </section>

            <section className="dashboard-workspace mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.72fr)_minmax(0,1fr)]">
              <Card className="dashboard-panel dashboard-macros-panel lg:col-span-1">
                <CardHeader className="pb-3 sm:p-7 sm:pb-3">
                  <CardTitle className="flex items-center gap-2 font-display text-xl">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Today's macros
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 sm:p-7 sm:pt-3">
                  <MacroRow
                    label="Protein"
                    value={totals.protein}
                    target={g.protein_g ?? 0}
                    unit="g"
                  />
                  <MacroRow
                    label="Carbohydrates"
                    value={totals.carbs}
                    target={g.carbs_g ?? 0}
                    unit="g"
                  />
                  <MacroRow
                    label="Healthy fats"
                    value={totals.fat}
                    target={g.fat_g ?? 0}
                    unit="g"
                  />
                  <MacroRow label="Fiber" value={totals.fiber} target={g.fiber_g ?? 0} unit="g" />
                  {totals.sugar !== null ? (
                    <MacroRow label="Sugar" value={totals.sugar} target={0} unit="g" />
                  ) : null}
                  {totals.sodium !== null ? (
                    <MacroRow label="Sodium" value={totals.sodium} target={0} unit="mg" />
                  ) : null}
                  <div className="dashboard-info rounded-2xl p-4 text-sm">
                    <p className="font-medium text-foreground">
                      Your maintenance is {g.tdee_kcal} kcal.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      To reach your goal, aim for{" "}
                      <strong className="text-foreground">{g.daily_calorie_target} kcal/day</strong>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="dashboard-action-rail min-w-0 space-y-2 pt-3">
                <UpcomingReminderMini reminders={reminders.data ?? []} />
                <Link to="/log" className="block">
                  <FeatureCard
                    icon={<Utensils className="h-5 w-5" />}
                    title="Log a meal"
                    description="AI-powered food logging"
                  />
                </Link>
                <Link to="/log" search={{ tab: "water" }} className="block">
                  <FeatureCard
                    icon={<Droplets className="h-5 w-5" />}
                    title="Log water"
                    description="Stay hydrated all day"
                  />
                </Link>
                <Link to="/workout" className="block">
                  <FeatureCard
                    icon={<Dumbbell className="h-5 w-5" />}
                    title="Today's workout"
                    description="AI plans + session logger"
                  />
                </Link>
                <Link to="/coach" className="block">
                  <FeatureCard
                    icon={<Sparkles className="h-5 w-5" />}
                    title="AI Coach"
                    description="Chat with your personal coach"
                  />
                </Link>
                <Link to="/scan" className="block">
                  <FeatureCard
                    icon={<Camera className="h-5 w-5" />}
                    title="Scan food"
                    description="Photo or barcode → instant nutrition"
                  />
                </Link>
                <Link to="/reminders" className="block">
                  <FeatureCard
                    icon={<Bell className="h-5 w-5" />}
                    title="Reminders"
                    description="Meals, water, workouts & more"
                  />
                </Link>
                <Link to="/community" className="block">
                  <FeatureCard
                    icon={<Users className="h-5 w-5" />}
                    title="Community"
                    description="Feed, friends & activity"
                  />
                </Link>
                <Link to="/achievements" className="block">
                  <FeatureCard
                    icon={<Trophy className="h-5 w-5" />}
                    title="Progress & badges"
                    description="XP, streaks & leaderboards"
                  />
                </Link>
              </div>
            </section>

            <section className="dashboard-bottom-grid mt-5 grid gap-4 sm:grid-cols-2">
              <Card className="dashboard-panel dashboard-plan-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <ClipboardList className="h-5 w-5 text-accent" />
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

              <Card className="dashboard-panel dashboard-plan-panel dashboard-weekly-panel">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    Weekly summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {weeklySummary.daysLogged > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Average on {weeklySummary.daysLogged} logged{" "}
                        {weeklySummary.daysLogged === 1 ? "day" : "days"}.
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <Row
                          label="Calories"
                          value={`${Math.round(weeklySummary.average.calories)} kcal`}
                        />
                        <Row
                          label="Protein"
                          value={`${Math.round(weeklySummary.average.protein)} g`}
                        />
                        <Row label="Carbs" value={`${Math.round(weeklySummary.average.carbs)} g`} />
                        <Row label="Fat" value={`${Math.round(weeklySummary.average.fat)} g`} />
                      </div>
                      {weeklySummary.mostLoggedFood ? (
                        <Row label="Most logged" value={weeklySummary.mostLoggedFood.name} />
                      ) : null}
                      {weeklySummary.mostLoggedRecipe ? (
                        <Row label="Top recipe" value={weeklySummary.mostLoggedRecipe.name} />
                      ) : null}
                    </>
                  ) : (
                    <p className="dashboard-eyebrow">
                      Your weekly nutrition summary will appear after you log a meal.
                    </p>
                  )}
                  <Button asChild variant="outline" className="rounded-xl">
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
          <Card className="rounded-2xl border-dashed border-primary/35 bg-card/70 p-8 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
              <Activity className="h-6 w-6 text-accent" />
            </div>
            <h2 className="mt-4 font-display text-xl">Finish setting up your plan</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete your health profile so NutriAI can build your personalized plan.
            </p>
            <Button asChild size="lg" className="mt-6 rounded-xl">
              <Link to="/onboarding">Continue onboarding</Link>
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}

function TopBar({ onSignOut, name }: { onSignOut: () => void; name: string }) {
  const who = useQuery(adminWhoAmIQueryOptions());
  return (
    <div className="dashboard-nav sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 sm:px-7 lg:px-10">
        <Link to="/dashboard" className="dashboard-brand flex items-center gap-2 text-foreground">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_22px_color-mix(in_oklch,var(--color-primary)_38%,transparent)]">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-[1.05rem]">NutriAI</span>
        </Link>
        <div className="flex items-center gap-2">
          {who.data?.isAdmin && (
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Admin</span>
              </Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link to="/settings">
              <Settings className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Settings</span>
            </Link>
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl"
            onClick={onSignOut}
            aria-label={`Sign ${name} out`}
          >
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
    <Card variant="stat" className="dashboard-action-card premium-card-hover">
      <CardContent className="p-5">
        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accent ?? "bg-secondary text-primary"}`}
        >
          {accent ? <span className="text-primary-foreground">{icon}</span> : icon}
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
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

function MacroRow({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target?: number;
  unit: string;
}) {
  const hasTarget = Boolean(target && target > 0);
  const pct = hasTarget ? Math.min(100, Math.round((value / (target ?? 1)) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          <strong className="text-foreground">{Math.round(value)}</strong>
          {hasTarget ? ` / ${target}` : null} {unit}
        </span>
      </div>
      {hasTarget ? <Progress value={pct} className="h-2" /> : null}
    </div>
  );
}

function UpcomingReminderMini({ reminders }: { reminders: Reminder[] }) {
  const items = reminders
    .filter((r) => r.enabled ?? r.is_active)
    .map((r) => ({ r, next: nextOccurrence(r) }))
    .filter((item): item is { r: Reminder; next: Date } => Boolean(item.next))
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .slice(0, 3);

  if (!items.length) return null;

  return (
    <Card variant="stat" className="dashboard-action-card">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between w-full p-2 rounded">
          <p className="font-medium text-foreground">Next reminder</p>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          {items.map(({ r, next }) => (
            <div key={r.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{r.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {typeLabel(r.type)} - {r.message ?? "Balanced plan time"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(next)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function FeatureCard({
  icon,
  title,
  description,
  soon,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  soon?: boolean;
}) {
  return (
    <Card variant="stat" className="dashboard-action-card premium-card-hover">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {soon && (
          <span className="rounded-xl bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent-foreground">
            Soon
          </span>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap justify-between gap-x-3 gap-y-1 border-b border-border/40 pb-2 last:border-0 last:pb-0">
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
