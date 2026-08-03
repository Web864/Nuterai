/**
 * Achievements & progress hub: badge catalog with progress, leaderboards,
 * streak history and the XP ledger.
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Flame, Lock, Sparkles, Trophy, Users } from "lucide-react";
import {
  achievementsQueryOptions,
  leaderboardQueryOptions,
  statsQueryOptions,
  streakHistoryQueryOptions,
  xpHistoryQueryOptions,
  type AchievementWithProgress,
  type LeaderboardMetric,
  type LeaderboardScope,
  type LeaderboardWindow,
} from "@/features/gamification/queries";
import { LevelCard } from "@/features/gamification/StatsWidgets";
import {
  CATEGORY_LABELS,
  DIFFICULTY_STYLES,
  initialsOf,
  relativeTime,
  STREAK_LABELS,
  type AchievementCategory,
  type AchievementDifficulty,
  type StreakKind,
} from "@/lib/gamification";
import { EmptyState } from "./community";

export const Route = createFileRoute("/_authenticated/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements & Leaderboards — NutriAI" },
      {
        name: "description",
        content: "Track your XP, levels, streaks and badges, and see how you rank against friends.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AchievementsPage,
});

function AchievementsPage() {
  const { userId } = AuthedRoute.useRouteContext();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Progress</h1>
            <p className="truncate text-sm text-muted-foreground">Badges, streaks, XP and leaderboards</p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/community">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Community
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <LevelCard userId={userId} />

        <Tabs defaultValue="badges">
          <TabsList className="w-full justify-start overflow-x-auto rounded-full">
            <TabsTrigger value="badges" className="rounded-full">Badges</TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-full">Leaderboard</TabsTrigger>
            <TabsTrigger value="streaks" className="rounded-full">Streaks</TabsTrigger>
            <TabsTrigger value="xp" className="rounded-full">XP history</TabsTrigger>
          </TabsList>

          <TabsContent value="badges" className="mt-4">
            <BadgesTab userId={userId} />
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-4">
            <LeaderboardTab />
          </TabsContent>
          <TabsContent value="streaks" className="mt-4">
            <StreaksTab userId={userId} />
          </TabsContent>
          <TabsContent value="xp" className="mt-4">
            <XpTab userId={userId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ------------------------------- badges ------------------------------- */

const CATEGORY_ORDER: AchievementCategory[] = [
  "nutrition",
  "workout",
  "hydration",
  "consistency",
  "community",
  "milestone",
];

function BadgesTab({ userId }: { userId: string }) {
  const q = useQuery(achievementsQueryOptions(userId));
  const [category, setCategory] = useState<"all" | AchievementCategory>("all");

  const rows = useMemo(() => {
    const all = q.data ?? [];
    // Secret achievements stay hidden until unlocked.
    const visible = all.filter((a) => !a.is_secret || a.unlocked_at);
    return category === "all" ? visible : visible.filter((a) => a.category === category);
  }, [q.data, category]);

  const unlockedCount = (q.data ?? []).filter((a) => a.unlocked_at).length;
  const total = (q.data ?? []).length;

  if (q.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (q.isError) {
    return (
      <EmptyState
        icon={<Trophy className="h-6 w-6 text-accent" />}
        title="Couldn't load achievements"
        description="Check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border-border/60">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Unlocked</p>
            <p className="font-display text-3xl">
              {unlockedCount}
              <span className="ml-1 font-sans text-sm text-muted-foreground">/ {total}</span>
            </p>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={total ? Math.round((unlockedCount / total) * 100) : 0} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter badges by category">
        <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
          All
        </FilterChip>
        {CATEGORY_ORDER.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {CATEGORY_LABELS[c]}
          </FilterChip>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6 text-accent" />}
          title="Nothing here yet"
          description="Keep logging — new badges appear as you make progress."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((a) => (
            <AchievementCard key={a.code} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-sm transition-organic ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function AchievementCard({ achievement: a }: { achievement: AchievementWithProgress }) {
  const unlocked = !!a.unlocked_at;
  const target = Number(a.target) || 1;
  const pct = Math.min(100, Math.round((a.progress / target) * 100));
  const style = DIFFICULTY_STYLES[a.difficulty as AchievementDifficulty];

  return (
    <Card
      className={`rounded-3xl border-border/60 transition-organic ${
        unlocked ? "bg-card shadow-soft" : "bg-card/60"
      }`}
    >
      <CardContent className="flex gap-4 p-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${
            unlocked ? "bg-accent/15" : "bg-secondary text-muted-foreground"
          }`}
          aria-hidden="true"
        >
          {unlocked ? a.icon : <Lock className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`font-medium ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{a.title}</p>
            <Badge variant="outline" className={`shrink-0 rounded-full text-[10px] ${style.className}`}>
              {style.label}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
          {unlocked ? (
            <p className="mt-2 text-xs text-primary">
              Unlocked {relativeTime(a.unlocked_at!)} · +{a.xp_reward} XP
            </p>
          ) : (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {Math.round(a.progress)} / {target}
                </span>
                <span>+{a.xp_reward} XP</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- leaderboard ----------------------------- */

const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  xp: "XP",
  workout_streak: "Workout streak",
  nutrition_streak: "Nutrition streak",
  login_streak: "Check-in streak",
};

function LeaderboardTab() {
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [metric, setMetric] = useState<LeaderboardMetric>("xp");
  const [window, setWindow] = useState<LeaderboardWindow>("all");
  const q = useQuery(leaderboardQueryOptions(scope, metric, window, 25));

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={scope} onValueChange={(v) => setScope(v as LeaderboardScope)}>
          <SelectTrigger className="rounded-2xl" aria-label="Leaderboard scope">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Everyone</SelectItem>
            <SelectItem value="friends">Friends only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={metric} onValueChange={(v) => setMetric(v as LeaderboardMetric)}>
          <SelectTrigger className="rounded-2xl" aria-label="Leaderboard metric">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(METRIC_LABELS) as LeaderboardMetric[]).map((m) => (
              <SelectItem key={m} value={m}>
                {METRIC_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={window}
          onValueChange={(v) => setWindow(v as LeaderboardWindow)}
          disabled={metric !== "xp"}
        >
          <SelectTrigger className="rounded-2xl" aria-label="Leaderboard time window">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6 text-accent" />}
          title="No ranking yet"
          description={
            scope === "friends"
              ? "Add friends in the community hub to compare progress."
              : "Make your profile public in settings to appear on the global board."
          }
        />
      ) : (
        <Card className="rounded-3xl border-border/60">
          <CardContent className="divide-y divide-border/40 p-0">
            {q.data.map((r) => (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 px-4 py-3 ${r.is_self ? "bg-secondary/50" : ""}`}
              >
                <span className="w-8 shrink-0 font-display text-lg text-muted-foreground">#{r.rank}</span>
                <Avatar className="h-9 w-9">
                  {r.avatar_url && <AvatarImage src={r.avatar_url} alt="" />}
                  <AvatarFallback className="text-xs">{initialsOf(r.display_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {r.username && !r.is_self ? (
                    <Link
                      to="/u/$username"
                      params={{ username: r.username }}
                      className="truncate font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {r.display_name ?? "Athlete"}
                    </Link>
                  ) : (
                    <p className="truncate font-medium text-foreground">
                      {r.is_self ? "You" : (r.display_name ?? "Athlete")}
                    </p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">Level {r.level}</p>
                </div>
                <span className="shrink-0 font-display text-lg text-foreground">
                  {r.value.toLocaleString()}
                  <span className="ml-1 font-sans text-xs text-muted-foreground">
                    {metric === "xp" ? "XP" : "d"}
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------- streaks ------------------------------- */

const ALL_STREAKS: StreakKind[] = ["nutrition", "workout", "water", "login", "coach", "reminder"];

function StreaksTab({ userId }: { userId: string }) {
  const stats = useQuery(statsQueryOptions(userId));
  const history = useQuery(streakHistoryQueryOptions(userId));

  if (stats.isLoading) return <Skeleton className="h-48 rounded-3xl" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_STREAKS.map((k) => {
          const current = stats.data?.[`${k}_streak`] ?? 0;
          const longest = stats.data?.[`longest_${k}_streak`] ?? 0;
          return (
            <Card key={k} className="rounded-3xl border-border/60">
              <CardContent className="p-5">
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  {STREAK_LABELS[k]}
                </p>
                <p className="mt-1 font-display text-3xl text-foreground">
                  {current}
                  <span className="ml-1 font-sans text-sm text-muted-foreground">days</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Best: {longest} days</p>
                <Progress
                  value={longest > 0 ? Math.min(100, Math.round((current / longest) * 100)) : 0}
                  className="mt-3 h-1.5"
                />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Streak history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.isLoading ? (
            <Skeleton className="h-20 rounded-2xl" />
          ) : !history.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No streak days recorded yet. Log something today to start one.
            </p>
          ) : (
            history.data.slice(0, 30).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between border-b border-border/40 pb-2 text-sm last:border-0 last:pb-0"
              >
                <span className="text-foreground">{STREAK_LABELS[r.kind as StreakKind]}</span>
                <span className="text-muted-foreground">
                  {new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })} ·{" "}
                  {r.streak_value} day{r.streak_value === 1 ? "" : "s"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------- XP --------------------------------- */

function XpTab({ userId }: { userId: string }) {
  const q = useQuery(xpHistoryQueryOptions(userId, 60));

  if (q.isLoading) return <Skeleton className="h-48 rounded-3xl" />;

  if (!q.data?.length) {
    return (
      <EmptyState
        icon={<Sparkles className="h-6 w-6 text-accent" />}
        title="No XP yet"
        description="Log a meal, water, a workout or chat with the coach to earn your first XP."
      />
    );
  }

  const total = q.data.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card className="rounded-3xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">
          Recent XP · {total.toLocaleString()} from the last {q.data.length} events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {q.data.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 text-sm last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="truncate text-foreground">{e.reason}</p>
              <p className="text-xs text-muted-foreground">{relativeTime(e.created_at)}</p>
            </div>
            <span className="shrink-0 font-medium text-primary">+{e.amount} XP</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
