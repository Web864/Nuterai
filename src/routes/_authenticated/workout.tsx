import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Dumbbell,
  Flame,
  Leaf,
  Loader2,
  Play,
  Plus,
  Sparkles,
  Star,
  Timer,
  Trash2,
} from "lucide-react";

import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { goalsQueryOptions } from "@/features/goals/queries";
import {
  plansQueryOptions,
  planDaysQueryOptions,
  sessionsQueryOptions,
  useDeletePlan,
  useDeleteSession,
  useLogSession,
  useSetActivePlan,
  parseExercises,
  type WorkoutSession,
  estimateCalories,
  type PlanExercise,
  type WorkoutPlan,
} from "@/features/workout/queries";
import { generateWorkoutPlan } from "@/lib/ai-workout.functions";

export const Route = createFileRoute("/_authenticated/workout")({
  head: () => ({
    meta: [
      { title: "Workouts — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkoutPage,
});

function WorkoutPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const navigate = useNavigate();
  const goals = useQuery(goalsQueryOptions(userId));
  const plans = useQuery(plansQueryOptions(userId));
  const sessions = useQuery(sessionsQueryOptions(userId));

  const activePlan = useMemo(
    () => (plans.data ?? []).find((p) => p.is_active) ?? plans.data?.[0],
    [plans.data],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2 text-foreground">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-display text-base tracking-tight">Workouts</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <header className="mb-6">
          <h1 className="font-display text-4xl text-foreground">Movement</h1>
          <p className="mt-2 text-muted-foreground">
            Generate AI-personalized workouts and log every session.
          </p>
        </header>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-full">
            <TabsTrigger value="plans" className="rounded-full">
              <Dumbbell className="mr-2 h-4 w-4" /> Plans
            </TabsTrigger>
            <TabsTrigger value="log" className="rounded-full">
              <Plus className="mr-2 h-4 w-4" /> Log
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">
              <Timer className="mr-2 h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-6 space-y-6">
            <AIGeneratorCard
              userId={userId}
              defaultGoal={goals.data?.fitness_goal ?? undefined}
              defaultGym={goals.data?.gym_access ?? undefined}
              defaultExp={goals.data?.workout_experience ?? undefined}
            />
            <PlansList userId={userId} plans={plans.data ?? []} activePlanId={activePlan?.id} />
          </TabsContent>

          <TabsContent value="log" className="mt-6">
            <QuickLogCard userId={userId} activePlanId={activePlan?.id} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <SessionHistory userId={userId} sessions={sessions.data ?? []} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ---------------- AI Generator ----------------
function AIGeneratorCard({
  userId,
  defaultGoal,
  defaultGym,
  defaultExp,
}: {
  userId: string;
  defaultGoal?: string;
  defaultGym?: string;
  defaultExp?: string;
}) {
  const qc = useQueryClient();
  const generate = useServerFn(generateWorkoutPlan);
  const [goal, setGoal] = useState(
    defaultGoal === "build_muscle"
      ? "Build lean muscle"
      : defaultGoal === "lose_weight"
        ? "Lose fat and stay lean"
        : "Get stronger and healthier",
  );
  const [gym, setGym] = useState<string>(defaultGym ?? "no_equipment");
  const [experience, setExperience] = useState<string>(defaultExp ?? "beginner");
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(45);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await generate({
        data: {
          goal,
          gym_access: gym as never,
          experience: experience as never,
          days_per_week: days,
          minutes_per_session: minutes,
          focus_notes: notes || undefined,
        },
      });
      toast.success(`Plan "${res.name}" created!`);
      qc.invalidateQueries({ queryKey: ["workout-plans", userId] });
      setNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-xl">
          <Sparkles className="h-5 w-5 text-accent" />
          AI-generated workout plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="goal">Your goal</Label>
          <Input
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Build muscle and lose 5 kg"
            className="mt-1.5 rounded-2xl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Experience</Label>
            <Select value={experience} onValueChange={setExperience}>
              <SelectTrigger className="mt-1.5 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Never trained</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Equipment access</Label>
            <Select value={gym} onValueChange={setGym}>
              <SelectTrigger className="mt-1.5 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_equipment">Bodyweight only</SelectItem>
                <SelectItem value="basic_equipment">Basic (bands/dumbbells)</SelectItem>
                <SelectItem value="home_gym">Home gym</SelectItem>
                <SelectItem value="full_gym">Full gym</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="days">Days per week</Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(7, Number(e.target.value) || 3)))}
              className="mt-1.5 rounded-2xl"
            />
          </div>
          <div>
            <Label htmlFor="minutes">Minutes / session</Label>
            <Input
              id="minutes"
              type="number"
              min={15}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(15, Math.min(180, Number(e.target.value) || 45)))}
              className="mt-1.5 rounded-2xl"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Preferences (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. bad knees, love kettlebells, no burpees"
            className="mt-1.5 rounded-2xl"
            rows={2}
          />
        </div>

        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={loading || !goal.trim()}
          className="w-full rounded-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Designing your plan...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Generate my plan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------- Plans list ----------------
function PlansList({
  userId,
  plans,
  activePlanId,
}: {
  userId: string;
  plans: WorkoutPlan[];
  activePlanId?: string;
}) {
  const setActive = useSetActivePlan(userId);
  const del = useDeletePlan(userId);

  if (plans.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/70 bg-card/50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
          <Dumbbell className="h-6 w-6 text-accent" />
        </div>
        <h3 className="mt-4 font-display text-xl">No plans yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Generate your first AI-personalized plan above.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isActive={plan.id === activePlanId}
          onActivate={() => setActive.mutate(plan.id, { onSuccess: () => toast.success("Set as active plan") })}
          onDelete={() =>
            del.mutate(plan.id, {
              onSuccess: () => toast.success("Plan deleted"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
            })
          }
        />
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  isActive,
  onActivate,
  onDelete,
}: {
  plan: WorkoutPlan;
  isActive: boolean;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const days = useQuery(planDaysQueryOptions(open ? plan.id : undefined));

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
              {isActive && (
                <Badge className="rounded-full bg-accent text-accent-foreground">
                  <Star className="mr-1 h-3 w-3" /> Active
                </Badge>
              )}
              {plan.source === "ai" && (
                <Badge variant="secondary" className="rounded-full">
                  <Sparkles className="mr-1 h-3 w-3" /> AI
                </Badge>
              )}
            </div>
            {plan.goal && <p className="mt-1 text-sm text-muted-foreground">{plan.goal}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.difficulty} · {plan.days_per_week}×/week · {plan.duration_weeks} weeks
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isActive && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={onActivate}>
                <Check className="mr-1 h-4 w-4" /> Set active
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label="Delete plan"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => setOpen((s) => !s)}
        >
          {open ? "Hide days" : "Show days"}
        </Button>
        {open && (
          <div className="mt-4 space-y-3">
            {days.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
            {(days.data ?? []).map((day) => {
              const exercises = parseExercises(day.exercises);
              return (
                <div key={day.id} className="rounded-2xl bg-secondary/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        Day {day.day_index} · {day.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {humanizeFocus(day.focus)} · ~{day.estimated_minutes} min
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {exercises.map((ex, i) => (
                      <li key={i} className="flex justify-between border-b border-border/40 py-1 last:border-0">
                        <span className="font-medium text-foreground">{ex.name}</span>
                        <span className="text-muted-foreground">
                          {ex.sets} × {ex.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Quick Log ----------------
function QuickLogCard({ userId, activePlanId }: { userId: string; activePlanId?: string }) {
  const days = useQuery(planDaysQueryOptions(activePlanId));
  const log = useLogSession(userId);
  const [selectedDayId, setSelectedDayId] = useState<string>("custom");
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<string>("full_body");
  const [duration, setDuration] = useState(45);
  const [effort, setEffort] = useState(7);
  const [intensity, setIntensity] = useState<"low" | "moderate" | "high">("moderate");
  const [notes, setNotes] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logExercises, setLogExercises] = useState<PlanExercise[]>([]);

  function pickDay(id: string) {
    setSelectedDayId(id);
    if (id === "custom") {
      setName("");
      setFocus("full_body");
      setLogExercises([]);
      return;
    }
    const d = days.data?.find((x) => x.id === id);
    if (d) {
      setName(d.title);
      setFocus(d.focus);
      setDuration(d.estimated_minutes);
      setLogExercises(parseExercises(d.exercises));
    }
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Give this session a name");
      return;
    }
    try {
      await log.mutateAsync({
        name,
        focus: focus as never,
        duration_minutes: duration,
        calories_kcal: estimateCalories(duration, intensity),
        perceived_effort: effort,
        notes: notes || null,
        exercises: logExercises as never,
        plan_day_id: selectedDayId !== "custom" ? selectedDayId : null,
      });
      toast.success("Workout logged!");
      setDialogOpen(false);
      setName("");
      setNotes("");
      setLogExercises([]);
      setSelectedDayId("custom");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log");
    }
  }

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-xl">
          <Play className="h-5 w-5 text-accent" />
          Log a workout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePlanId && (days.data?.length ?? 0) > 0 && (
          <div>
            <Label>Start from active plan</Label>
            <Select value={selectedDayId} onValueChange={pickDay}>
              <SelectTrigger className="mt-1.5 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom / freestyle</SelectItem>
                {(days.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    Day {d.day_index} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="wname">Session name</Label>
          <Input
            id="wname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push day, Morning run"
            className="mt-1.5 rounded-2xl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Focus</Label>
            <Select value={focus} onValueChange={setFocus}>
              <SelectTrigger className="mt-1.5 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_body">Full body</SelectItem>
                <SelectItem value="upper">Upper</SelectItem>
                <SelectItem value="lower">Lower</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="pull">Pull</SelectItem>
                <SelectItem value="legs">Legs</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
                <SelectItem value="mobility">Mobility</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dur">Duration (min)</Label>
            <Input
              id="dur"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 0))}
              className="mt-1.5 rounded-2xl"
            />
          </div>
          <div>
            <Label>Intensity</Label>
            <Select value={intensity} onValueChange={(v) => setIntensity(v as never)}>
              <SelectTrigger className="mt-1.5 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="effort">Perceived effort: {effort}/10</Label>
          <Input
            id="effort"
            type="range"
            min={1}
            max={10}
            value={effort}
            onChange={(e) => setEffort(Number(e.target.value))}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="wnotes">Notes</Label>
          <Textarea
            id="wnotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it feel?"
            className="mt-1.5 rounded-2xl"
            rows={2}
          />
        </div>

        {logExercises.length > 0 && (
          <div className="rounded-2xl bg-secondary/40 p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Exercises</p>
            <ul className="space-y-1 text-sm">
              {logExercises.map((ex, i) => (
                <li key={i} className="flex justify-between text-muted-foreground">
                  <span className="text-foreground">{ex.name}</span>
                  <span>
                    {ex.sets} × {ex.reps}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-accent/10 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-foreground">
              ~{estimateCalories(duration, intensity).toLocaleString()} kcal burned
            </span>
          </div>
          <Button size="lg" className="rounded-full" onClick={submit} disabled={log.isPending}>
            {log.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Log workout
          </Button>
        </div>
      </CardContent>

      {/* Dialog placeholder kept simple; kept for future exercise-level logging */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log details</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------- History ----------------
function SessionHistory({
  userId,
  sessions,
}: {
  userId: string;
  sessions: WorkoutSession[];
}) {
  const del = useDeleteSession(userId);

  if (sessions.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed border-border/70 bg-card/50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15">
          <Timer className="h-6 w-6 text-accent" />
        </div>
        <h3 className="mt-4 font-display text-xl">No sessions logged yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Every logged workout will show up here.
        </p>
      </Card>
    );
  }

  const totalMinutes = sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
  const totalKcal = sessions.reduce((a, s) => a + (s.calories_kcal ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatBox label="Total sessions" value={sessions.length.toString()} />
        <StatBox label="Total minutes" value={totalMinutes.toLocaleString()} />
        <StatBox label="Est. calories" value={totalKcal.toLocaleString()} />
      </div>

      <div className="space-y-3">
        {sessions.map((s) => (
          <Card key={s.id} className="rounded-3xl border-border/60 shadow-soft">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.logged_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {humanizeFocus(s.focus)} · {s.duration_minutes} min · {s.calories_kcal} kcal
                  {s.perceived_effort ? ` · RPE ${s.perceived_effort}` : ""}
                </p>
                {s.notes && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">{s.notes}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-destructive hover:text-destructive"
                onClick={() =>
                  del.mutate(s.id, {
                    onSuccess: () => toast.success("Session deleted"),
                  })
                }
                aria-label="Delete session"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-3xl text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function humanizeFocus(f: string): string {
  return (
    {
      full_body: "Full body",
      upper: "Upper",
      lower: "Lower",
      push: "Push",
      pull: "Pull",
      legs: "Legs",
      core: "Core",
      cardio: "Cardio",
      hiit: "HIIT",
      mobility: "Mobility",
      rest: "Rest",
      custom: "Custom",
    }[f] ?? f
  );
}
