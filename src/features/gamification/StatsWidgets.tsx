/**
 * Reusable gamification widgets (level card, streak strip, badge shelf).
 * Shared by the dashboard, the achievements hub and public profiles so the
 * XP/level presentation stays consistent everywhere.
 */

import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Sparkles, Trophy } from "lucide-react";
import { levelProgress, STREAK_LABELS, type StreakKind } from "@/lib/gamification";
import { achievementsQueryOptions, statsQueryOptions } from "./queries";

const STREAKS: StreakKind[] = ["nutrition", "workout", "water", "login"];

/** Level + XP progress, with a compact streak strip underneath. */
export function LevelCard({ userId }: { userId: string | undefined }) {
  const stats = useQuery(statsQueryOptions(userId));

  if (stats.isLoading) return <Skeleton className="h-44 rounded-3xl" />;

  const lp = levelProgress(stats.data?.xp ?? 0);

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Level</p>
            <p className="font-display text-4xl text-foreground">{lp.level}</p>
          </div>
          <Link
            to="/achievements"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-primary transition-organic hover:bg-secondary/70"
          >
            <Trophy className="h-3.5 w-3.5" />
            {stats.data?.achievements_count ?? 0} badges
          </Link>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>{lp.xp.toLocaleString()} XP</span>
            <span>{lp.toNextLevel.toLocaleString()} XP to level {lp.level + 1}</span>
          </div>
          <Progress value={lp.percent} className="h-2" aria-label={`Level progress ${lp.percent}%`} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STREAKS.map((k) => (
            <div key={k} className="rounded-2xl border border-border/40 px-3 py-2">
              <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Flame className="h-3 w-3 text-accent" />
                {STREAK_LABELS[k]}
              </p>
              <p className="font-display text-xl text-foreground">
                {stats.data?.[`${k}_streak`] ?? 0}
                <span className="ml-1 font-sans text-[11px] text-muted-foreground">d</span>
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Most recently unlocked badges — small, link-out shelf. */
export function BadgeShelf({ userId, limit = 6 }: { userId: string | undefined; limit?: number }) {
  const achievements = useQuery(achievementsQueryOptions(userId));
  const unlocked = (achievements.data ?? [])
    .filter((a) => a.unlocked_at)
    .sort((a, b) => (b.unlocked_at ?? "").localeCompare(a.unlocked_at ?? ""))
    .slice(0, limit);

  if (achievements.isLoading) return <Skeleton className="h-24 rounded-3xl" />;

  return (
    <Card className="rounded-3xl border-border/60 shadow-soft">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-lg text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Recent badges
          </p>
          <Link to="/achievements" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            View all
          </Link>
        </div>
        {unlocked.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No badges yet — log a meal or a workout to unlock your first one.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {unlocked.map((a) => (
              <Badge key={a.code} variant="outline" className="rounded-full px-3 py-1">
                <span aria-hidden="true">{a.icon}</span>
                <span className="ml-1.5">{a.title}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
