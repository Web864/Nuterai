import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Flag,
  Gauge,
  Loader2,
  ScrollText,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Route as AuthedRoute } from "./route";
import {
  adminAchievementsQueryOptions,
  adminAuditQueryOptions,
  adminOverviewQueryOptions,
  adminReportsQueryOptions,
  adminSettingsQueryOptions,
  adminUserDetailQueryOptions,
  adminUsersQueryOptions,
  adminWhoAmIQueryOptions,
  useAdminModeratePost,
  useAdminSetRole,
  useAdminSetVisibility,
  useAdminUpdateAchievement,
  useAdminUpdateSetting,
} from "@/features/admin/queries";
import { initialsOf, relativeTime } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — NutriAI" },
      {
        name: "description",
        content: "Operations console for NutriAI: users, moderation, analytics and settings.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const who = useQuery(adminWhoAmIQueryOptions());

  if (who.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Checking access" />
      </div>
    );
  }

  if (!who.data?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md rounded-3xl border-border/60 text-center">
          <CardContent className="p-8">
            <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-display text-2xl">Admins only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This console is restricted to accounts with the admin role.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl tracking-tight">Admin console</h1>
            <p className="text-xs text-muted-foreground">
              Signed in as admin · {userId.slice(0, 8)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="overview">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 rounded-2xl bg-secondary/60 p-1">
            <TabsTrigger value="overview" className="rounded-xl">
              <Gauge className="mr-1.5 h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-xl">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Users
            </TabsTrigger>
            <TabsTrigger value="moderation" className="rounded-xl">
              <Flag className="mr-1.5 h-3.5 w-3.5" /> Moderation
            </TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-xl">
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> Achievements
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Settings
            </TabsTrigger>
            <TabsTrigger value="audit" className="rounded-xl">
              <ScrollText className="mr-1.5 h-3.5 w-3.5" /> Audit log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="users" className="mt-5">
            <UsersTab />
          </TabsContent>
          <TabsContent value="moderation" className="mt-5">
            <ModerationTab />
          </TabsContent>
          <TabsContent value="achievements" className="mt-5">
            <AchievementsTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-5">
            <SettingsTab />
          </TabsContent>
          <TabsContent value="audit" className="mt-5">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-3xl text-foreground">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Sparkline({ data, label }: { data: { day: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card className="rounded-3xl border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-24 items-end gap-1"
          role="img"
          aria-label={`${label}, last ${data.length} days`}
        >
          {data.map((d) => (
            <div key={d.day} className="flex-1" title={`${d.day}: ${d.count}`}>
              <div
                className="w-full rounded-t-md bg-primary/70"
                style={{ height: `${Math.max(4, (d.count / max) * 96)}px` }}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {data.reduce((s, d) => s + d.count, 0).toLocaleString()} in the last {data.length} days
        </p>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const q = useQuery(adminOverviewQueryOptions());
  if (q.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (q.error)
    return <p className="text-sm text-destructive">Could not load analytics. {q.error.message}</p>;
  const t = q.data!.totals;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={t.users} hint={`+${t.newUsers7} this week`} />
        <Stat
          label="Onboarded"
          value={t.onboarded}
          hint={`${Math.round((t.onboarded / Math.max(t.users, 1)) * 100)}% completion`}
        />
        <Stat label="Meals logged" value={t.meals} hint={`+${t.meals7} this week`} />
        <Stat label="Workouts" value={t.workouts} hint={`+${t.workouts7} this week`} />
        <Stat label="Coach messages" value={t.coachMsgs} hint={`+${t.coachMsgs7} this week`} />
        <Stat label="Reminders" value={t.reminders} />
        <Stat label="Posts / comments" value={`${t.posts} / ${t.comments}`} />
        <Stat label="Open reports" value={t.openReports} hint="needs review" />
        <Stat label="Badges unlocked" value={t.achievementsUnlocked} />
        <Stat label="XP awarded (30d)" value={t.xp30} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Sparkline data={q.data!.series.signups} label="Signups" />
        <Sparkline data={q.data!.series.meals} label="Meals logged" />
        <Sparkline data={q.data!.series.workouts} label="Workouts logged" />
      </div>
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [openUser, setOpenUser] = useState<string | null>(null);
  const users = useQuery(adminUsersQueryOptions(q, offset));
  const setRole = useAdminSetRole();
  const setVisibility = useAdminSetVisibility();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="admin-user-search" className="sr-only">
          Search users
        </Label>
        <Input
          id="admin-user-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value.slice(0, 120));
            setOffset(0);
          }}
          placeholder="Search by name, handle or email"
          className="max-w-sm rounded-full"
        />
        <p className="text-xs text-muted-foreground">{users.data?.total ?? 0} accounts</p>
      </div>

      {users.isLoading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : !users.data?.rows.length ? (
        <p className="text-sm text-muted-foreground">No users match that search.</p>
      ) : (
        <div className="space-y-2">
          {users.data.rows.map((u) => (
            <Card key={u.id} className="rounded-2xl border-border/60">
              <CardContent className="flex flex-wrap items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  {u.avatar_url && <AvatarImage src={u.avatar_url} alt="" />}
                  <AvatarFallback>{initialsOf(u.display_name ?? u.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {u.display_name ?? u.full_name ?? "Athlete"}
                    {u.username && (
                      <span className="ml-1.5 text-muted-foreground">@{u.username}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? "no email"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.roles.map((r) => (
                    <Badge
                      key={r}
                      variant={r === "admin" ? "default" : "outline"}
                      className="rounded-full"
                    >
                      {r}
                    </Badge>
                  ))}
                  {!u.onboarding_completed && (
                    <Badge variant="outline" className="rounded-full text-muted-foreground">
                      onboarding
                    </Badge>
                  )}
                  <Badge variant="outline" className="rounded-full">
                    Lv {u.stats?.level ?? 1} · {(u.stats?.xp ?? 0).toLocaleString()} XP
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      setRole.mutate({
                        userId: u.id,
                        role: "admin",
                        grant: !u.roles.includes("admin"),
                      })
                    }
                    disabled={setRole.isPending}
                  >
                    {u.roles.includes("admin") ? "Revoke admin" : "Make admin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setVisibility.mutate({ userId: u.id, isPublic: !u.is_public })}
                    disabled={setVisibility.isPending}
                  >
                    {u.is_public ? "Make private" : "Make public"}
                  </Button>
                  <Button size="sm" className="rounded-full" onClick={() => setOpenUser(u.id)}>
                    Inspect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-full"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 25))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          className="rounded-full"
          disabled={offset + 25 >= (users.data?.total ?? 0)}
          onClick={() => setOffset(offset + 25)}
        >
          Next
        </Button>
      </div>

      <UserSheet userId={openUser} onClose={() => setOpenUser(null)} />
    </div>
  );
}

function UserSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const detail = useQuery(adminUserDetailQueryOptions(userId));
  const d = detail.data;

  return (
    <Sheet open={Boolean(userId)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">
            {d?.profile?.display_name ?? d?.profile?.full_name ?? "User detail"}
          </SheetTitle>
        </SheetHeader>

        {detail.isLoading || !d ? (
          <Skeleton className="mt-6 h-64 rounded-2xl" />
        ) : (
          <div className="mt-5 space-y-5 text-sm">
            <section>
              <h3 className="font-display text-base">Profile</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  Email<dd className="text-foreground">{d.profile?.email ?? "—"}</dd>
                </div>
                <div>
                  Handle<dd className="text-foreground">{d.profile?.username ?? "—"}</dd>
                </div>
                <div>
                  Location
                  <dd className="text-foreground">
                    {[d.profile?.city, d.profile?.country].filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  Roles<dd className="text-foreground">{d.roles.join(", ") || "user"}</dd>
                </div>
                <div>
                  Level<dd className="text-foreground">{d.stats?.level ?? 1}</dd>
                </div>
                <div>
                  XP<dd className="text-foreground">{(d.stats?.xp ?? 0).toLocaleString()}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="font-display text-base">Targets</h3>
              <p className="mt-1 text-muted-foreground">
                {d.goals
                  ? `${d.goals.daily_calorie_target ?? "—"} kcal · P ${d.goals.protein_g ?? "—"}g · C ${d.goals.carbs_g ?? "—"}g · F ${d.goals.fat_g ?? "—"}g · goal ${d.goals.fitness_goal ?? "—"}`
                  : "No goals set yet."}
              </p>
            </section>

            <DetailList
              title="Recent meals"
              rows={d.meals.map(
                (m) =>
                  `${m.name} · ${Math.round(m.calories_kcal)} kcal · ${relativeTime(m.logged_at)}`,
              )}
            />
            <DetailList
              title="Recent workouts"
              rows={d.workouts.map(
                (w) => `${w.name} · ${w.duration_minutes}min · ${relativeTime(w.logged_at)}`,
              )}
            />
            <DetailList
              title="Coach threads"
              rows={d.threads.map((t) => `${t.title} · ${relativeTime(t.last_message_at)}`)}
            />
            <DetailList
              title="Reminders"
              rows={d.reminders.map(
                (r) => `${r.title} · ${r.type} · ${r.is_active ? "active" : "paused"}`,
              )}
            />
            <DetailList
              title="Posts"
              rows={d.posts.map(
                (p) =>
                  `${p.is_hidden ? "[hidden] " : ""}${p.content.slice(0, 60)} · ♥ ${p.like_count}`,
              )}
            />
            <DetailList
              title="XP ledger"
              rows={d.xp.map((x) => `${x.amount > 0 ? "+" : ""}${x.amount} · ${x.reason}`)}
            />
            <DetailList
              title="Achievements"
              rows={d.achievements.map(
                (a) =>
                  `${a.achievement_code} · ${a.progress}/${a.target}${a.unlocked_at ? " ✓" : ""}`,
              )}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section>
      <h3 className="font-display text-base">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {rows.map((r, i) => (
            <li
              key={`${title}-${i}`}
              className="truncate border-b border-border/40 pb-1 text-foreground last:border-0"
            >
              {r}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ModerationTab() {
  const [status, setStatus] = useState<"open" | "reviewed" | "dismissed" | "all">("open");
  const reports = useQuery(adminReportsQueryOptions(status));
  const moderate = useAdminModeratePost();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["open", "reviewed", "dismissed", "all"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => setStatus(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {reports.isLoading ? (
        <Skeleton className="h-48 rounded-3xl" />
      ) : !reports.data?.length ? (
        <Card className="rounded-3xl border-border/60">
          <CardContent className="p-8 text-center">
            <Flag className="mx-auto h-6 w-6 text-accent" />
            <p className="mt-3 font-display text-lg">Queue is clear</p>
            <p className="text-sm text-muted-foreground">No reports with this status.</p>
          </CardContent>
        </Card>
      ) : (
        reports.data.map((r) => (
          <Card key={r.id} className="rounded-2xl border-border/60">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full capitalize">
                  {r.reason}
                </Badge>
                <Badge
                  variant={r.status === "open" ? "default" : "outline"}
                  className="rounded-full capitalize"
                >
                  {r.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{relativeTime(r.created_at)}</span>
              </div>
              {r.details && <p className="text-sm text-muted-foreground">“{r.details}”</p>}
              <div className="rounded-2xl bg-secondary/50 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {r.author?.display_name ?? "Unknown author"}
                  {r.author?.username ? ` · @${r.author.username}` : ""}
                  {r.post?.is_hidden ? " · hidden" : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">
                  {r.post?.content ?? "Post deleted."}
                </p>
              </div>
              {r.post && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={moderate.isPending}
                    onClick={() =>
                      moderate.mutate({
                        postId: r.post!.id,
                        reportId: r.id,
                        action: r.post!.is_hidden ? "unhide" : "hide",
                      })
                    }
                  >
                    {r.post.is_hidden ? "Unhide post" : "Hide post"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    disabled={moderate.isPending}
                    onClick={() =>
                      moderate.mutate({ postId: r.post!.id, reportId: r.id, action: "dismiss" })
                    }
                  >
                    Dismiss report
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-full"
                    disabled={moderate.isPending}
                    onClick={() =>
                      moderate.mutate({ postId: r.post!.id, reportId: r.id, action: "delete" })
                    }
                  >
                    Delete post
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function AchievementsTab() {
  const list = useQuery(adminAchievementsQueryOptions());
  const update = useAdminUpdateAchievement();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    xp_reward: 0,
    target: 1,
    is_secret: false,
  });

  const rows = useMemo(() => list.data ?? [], [list.data]);

  if (list.isLoading) return <Skeleton className="h-64 rounded-3xl" />;

  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <Card key={a.code} className="rounded-2xl border-border/60">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span aria-hidden="true">{a.icon}</span>
              <p className="font-medium text-foreground">{a.title}</p>
              <Badge variant="outline" className="rounded-full capitalize">
                {a.category}
              </Badge>
              <Badge variant="outline" className="rounded-full capitalize">
                {a.difficulty}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {a.xp_reward} XP · target {a.target}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {a.unlockCount} unlocked
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto rounded-full"
                onClick={() => {
                  setEditing(editing === a.code ? null : a.code);
                  setDraft({
                    title: a.title,
                    description: a.description,
                    xp_reward: a.xp_reward,
                    target: Number(a.target),
                    is_secret: a.is_secret,
                  });
                }}
              >
                {editing === a.code ? "Close" : "Edit"}
              </Button>
            </div>

            {editing === a.code && (
              <div className="grid gap-3 rounded-2xl bg-secondary/40 p-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor={`t-${a.code}`}>Title</Label>
                  <Input
                    id={`t-${a.code}`}
                    value={draft.title}
                    maxLength={120}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor={`d-${a.code}`}>Description</Label>
                  <Textarea
                    id={`d-${a.code}`}
                    value={draft.description}
                    maxLength={400}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`x-${a.code}`}>XP reward</Label>
                  <Input
                    id={`x-${a.code}`}
                    type="number"
                    min={0}
                    max={5000}
                    value={draft.xp_reward}
                    onChange={(e) => setDraft({ ...draft, xp_reward: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor={`g-${a.code}`}>Target</Label>
                  <Input
                    id={`g-${a.code}`}
                    type="number"
                    min={1}
                    value={draft.target}
                    onChange={(e) => setDraft({ ...draft, target: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id={`s-${a.code}`}
                    checked={draft.is_secret}
                    onCheckedChange={(v) => setDraft({ ...draft, is_secret: v })}
                  />
                  <Label htmlFor={`s-${a.code}`}>Secret achievement</Label>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    className="rounded-full"
                    disabled={update.isPending || draft.title.trim().length < 2}
                    onClick={() =>
                      update.mutate(
                        { code: a.code, ...draft, target: Math.max(1, draft.target) },
                        { onSuccess: () => setEditing(null) },
                      )
                    }
                  >
                    {update.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SettingsTab() {
  const list = useQuery(adminSettingsQueryOptions());
  const update = useAdminUpdateSetting();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (list.isLoading) return <Skeleton className="h-48 rounded-3xl" />;

  return (
    <div className="space-y-3">
      {(list.data ?? []).map((s) => {
        const raw = drafts[s.key] ?? JSON.stringify(s.value, null, 2);
        let valid = true;
        try {
          JSON.parse(raw);
        } catch {
          valid = false;
        }
        return (
          <Card key={s.key} className="rounded-2xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">{s.key}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {s.description} · {s.is_public ? "public" : "admin only"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor={`set-${s.key}`} className="sr-only">
                {s.key} value
              </Label>
              <Textarea
                id={`set-${s.key}`}
                value={raw}
                rows={4}
                className="font-mono text-xs"
                onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
              />
              {!valid && <p className="text-xs text-destructive">Not valid JSON.</p>}
              <Button
                size="sm"
                className="rounded-full"
                disabled={!valid || update.isPending}
                onClick={() =>
                  update.mutate({ key: s.key, value: JSON.parse(raw) as Record<string, unknown> })
                }
              >
                Save
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AuditTab() {
  const log = useQuery(adminAuditQueryOptions());
  if (log.isLoading) return <Skeleton className="h-64 rounded-3xl" />;
  if (!log.data?.length)
    return <p className="text-sm text-muted-foreground">No admin actions recorded yet.</p>;

  return (
    <Card className="rounded-3xl border-border/60">
      <CardContent className="divide-y divide-border/40 p-0">
        {log.data.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <Badge variant="outline" className="rounded-full">
              {e.action}
            </Badge>
            <span className="text-muted-foreground">{e.target_type}</span>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {e.target_id ?? "—"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {e.actor?.display_name ?? e.actor?.email ?? "system"} · {relativeTime(e.created_at)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
