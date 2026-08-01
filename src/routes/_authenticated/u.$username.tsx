import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Route as AuthedRoute } from "./route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trophy } from "lucide-react";
import {
  publicProfileByUsernameQueryOptions,
  userActivityQueryOptions,
} from "@/features/community/queries";
import { publicAchievementsQueryOptions, statsQueryOptions } from "@/features/gamification/queries";
import { initialsOf, levelProgress, relativeTime, STREAK_LABELS } from "@/lib/gamification";
import { EmptyState } from "./community";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({
    meta: [
      { title: "Profile — NutriAI" },
      { name: "description", content: "An athlete's NutriAI profile: level, streaks and achievements." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { userId } = AuthedRoute.useRouteContext();
  const profile = useQuery(publicProfileByUsernameQueryOptions(username));
  const targetId = profile.data?.id;
  const stats = useQuery(statsQueryOptions(targetId));
  const achievements = useQuery(publicAchievementsQueryOptions(targetId));
  const activity = useQuery(userActivityQueryOptions(targetId));

  const name = profile.data?.display_name ?? profile.data?.full_name ?? "Athlete";
  const lp = levelProgress(stats.data?.xp ?? 0);
  const isSelf = targetId === userId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/community" aria-label="Back to community">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-display text-2xl tracking-tight">Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        {profile.isLoading ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : !profile.data ? (
          <EmptyState
            icon={<Trophy className="h-6 w-6 text-accent" />}
            title="Profile unavailable"
            description="This profile doesn't exist or is private."
          />
        ) : (
          <>
            <Card className="rounded-3xl border-border/60">
              <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
                <Avatar className="h-20 w-20">
                  {profile.data.avatar_url && <AvatarImage src={profile.data.avatar_url} alt="" />}
                  <AvatarFallback className="text-xl">{initialsOf(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl">{name}</h2>
                  {profile.data.username && (
                    <p className="text-sm text-muted-foreground">@{profile.data.username}</p>
                  )}
                  {profile.data.bio && <p className="mt-2 text-sm text-foreground">{profile.data.bio}</p>}
                  {isSelf && (
                    <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                      <Link to="/settings">Edit profile</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {profile.data.show_stats !== false && (
              <Card className="rounded-3xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base">Level {lp.level}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between text-sm text-muted-foreground">
                      <span>{lp.xp.toLocaleString()} XP</span>
                      <span>{lp.toNextLevel.toLocaleString()} to level {lp.level + 1}</span>
                    </div>
                    <Progress value={lp.percent} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {(["workout", "nutrition", "water", "login", "coach", "reminder"] as const).map((k) => (
                      <div key={k} className="rounded-2xl border border-border/40 p-3">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {STREAK_LABELS[k]}
                        </p>
                        <p className="font-display text-2xl">
                          {stats.data?.[`${k}_streak`] ?? 0}
                          <span className="ml-1 text-xs font-sans text-muted-foreground">days</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {profile.data.show_achievements !== false && (
              <Card className="rounded-3xl border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-base">
                    Achievements ({achievements.data?.length ?? 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {!achievements.data?.length ? (
                    <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p>
                  ) : (
                    achievements.data.map((a) => (
                      <Badge key={a.code} variant="outline" className="rounded-full px-3 py-1">
                        🏆 {a.title}
                      </Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="rounded-3xl border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!activity.data?.length ? (
                  <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
                ) : (
                  activity.data.map((e) => (
                    <div key={e.id} className="flex justify-between border-b border-border/40 pb-2 text-sm last:border-0">
                      <span className="text-foreground">{e.title}</span>
                      <span className="text-muted-foreground">{relativeTime(e.created_at)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
