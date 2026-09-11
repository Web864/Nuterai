import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route as AuthedRoute } from "./route";
import { useGamification } from "@/features/gamification/useGamification";
import {
  reminderEventsQueryOptions,
  remindersQueryOptions,
  notificationsQueryOptions,
  useCreateDietPlanReminders,
  useCreateHydrationReminders,
  useCreateWorkoutPlanReminders,
  useCreateReminder,
  useDeleteReminder,
  useMarkNotification,
  useRecordReminderEvent,
  useSnoozeReminder,
  useUpdateReminder,
  type Reminder,
} from "@/features/reminders/queries";
import { goalsQueryOptions, profileQueryOptions, useUpdateProfile } from "@/features/goals/queries";
import { plansQueryOptions } from "@/features/workout/queries";
import { checkNotificationPermission, requestNotificationPermission } from "@/features/reminders/useReminderEngine";
import { isNative } from "@/lib/native";
import {
  DEFAULT_MEAL_TIMES,
  REMINDER_TYPES,
  SNOOZE_OPTIONS,
  detectTimezone,
  formatWhen,
  nextOccurrence,
  normalizeRule,
  recurrenceLabel,
  sourceLabel,
  type ReminderType,
  typeLabel,
} from "@/lib/reminders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bell, BellOff, Check, Clock, Droplets, Moon, Plus, Sparkles, Trash2, Utensils, X, Dumbbell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminder Center - NutriAI" }, { name: "robots", content: "noindex" }] }),
  component: RemindersPage,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function RemindersPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const reminders = useQuery(remindersQueryOptions(userId));
  const notifications = useQuery(notificationsQueryOptions(userId));
  const events = useQuery(reminderEventsQueryOptions(userId));
  const profile = useQuery(profileQueryOptions(userId));
  const goals = useQuery(goalsQueryOptions(userId));
  const workoutPlans = useQuery(plansQueryOptions(userId));
  const [permission, setPermission] = useState<NotificationPermission>(isNative || typeof window === "undefined" || !("Notification" in window) ? "default" : Notification.permission);

  useEffect(() => {
    void checkNotificationPermission().then(setPermission);
  }, []);

  const enriched = useMemo(() => {
    const now = new Date();
    return (reminders.data ?? [])
      .map((r) => ({ r, next: nextOccurrence(r, now) }))
      .sort((a, b) => (a.next?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.next?.getTime() ?? Number.MAX_SAFE_INTEGER));
  }, [reminders.data]);

  const today = enriched.filter((item) => item.next && item.next.toDateString() === new Date().toDateString() && (item.r.enabled ?? item.r.is_active));
  const upcoming = enriched.filter((item) => item.next && (item.r.enabled ?? item.r.is_active)).slice(0, 20);
  const auto = (reminders.data ?? []).filter((r) => ["diet_plan", "water_plan", "workout_plan", "system"].includes(r.source ?? ""));
  const manual = (reminders.data ?? []).filter((r) => (r.source ?? "manual") === "manual" || r.source === "ai_coach");
  const paused = (reminders.data ?? []).filter((r) => !(r.enabled ?? r.is_active));
  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;
  const timezone = profile.data?.timezone ?? detectTimezone();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <span className="font-display text-lg">Reminder Center</span>
            {unread > 0 && <Badge variant="destructive" className="rounded-full">{unread}</Badge>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl min-w-0 px-3 py-6 sm:px-6 sm:py-8">
        {permission !== "granted" && <PermissionCard permission={permission} onChange={setPermission} />}

        <div className="mb-6 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AutoDietCard userId={userId} timezone={timezone} />
          <HydrationCard userId={userId} timezone={timezone} waterTarget={goals.data?.water_target_ml ?? goals.data?.daily_water_ml ?? 2500} wakeTime={goals.data?.wake_time ?? "08:00"} sleepTime={goals.data?.sleep_time ?? "22:00"} />
          <AutoWorkoutCard userId={userId} timezone={timezone} planId={(workoutPlans.data ?? []).find((p) => p.is_active)?.id} />
          <Card className="rounded-3xl">
            <CardContent className="p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary"><Sparkles className="h-5 w-5" /></div>
              <p className="mt-4 font-medium">AI Coach ready</p>
              <p className="mt-1 text-sm text-muted-foreground">Ask Coach to create, pause, snooze, list, or remove reminders with confirmation.</p>
              <Button asChild variant="outline" className="mt-4 rounded-xl"><Link to="/coach">Open Coach</Link></Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="flex h-auto w-full min-w-0 flex-wrap rounded-2xl">
            <TabsTrigger value="today" className="rounded-xl">Today</TabsTrigger>
            <TabsTrigger value="upcoming" className="rounded-xl">Upcoming</TabsTrigger>
            <TabsTrigger value="auto" className="rounded-xl">Auto reminders</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-xl">Manual</TabsTrigger>
            <TabsTrigger value="paused" className="rounded-xl">Paused</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl">History</TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-xl">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6"><ReminderCards userId={userId} items={today.map((x) => x.r)} /></TabsContent>
          <TabsContent value="upcoming" className="mt-6"><UpcomingList userId={userId} items={upcoming} /></TabsContent>
          <TabsContent value="auto" className="mt-6"><ReminderCards userId={userId} items={auto} /></TabsContent>
          <TabsContent value="manual" className="mt-6 space-y-6"><CreateReminderCard userId={userId} defaultTz={timezone} /><ReminderCards userId={userId} items={manual} editable /></TabsContent>
          <TabsContent value="paused" className="mt-6"><ReminderCards userId={userId} items={paused} /></TabsContent>
          <TabsContent value="history" className="mt-6"><History userId={userId} events={events.data ?? []} /></TabsContent>
          <TabsContent value="preferences" className="mt-6"><PreferencesCard userId={userId} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function PermissionCard({ permission, onChange }: { permission: NotificationPermission; onChange: (p: NotificationPermission) => void }) {
  return (
    <Card className="mb-6 rounded-3xl border-accent/40 bg-accent/5">
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-medium">Enable notifications</p><p className="text-sm text-muted-foreground">Enable notifications so NutriAI can remind you about meals, hydration, and your plan.</p></div>
        <Button onClick={async () => { const p = await requestNotificationPermission(); onChange(p); p === "granted" ? toast.success("Notifications enabled") : toast.error("Notifications were not enabled"); }} disabled={permission === "denied"} className="rounded-full">
          <Bell className="mr-2 h-4 w-4" />{permission === "denied" ? "Blocked" : "Enable"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AutoDietCard({ userId, timezone }: { userId: string; timezone: string }) {
  const create = useCreateDietPlanReminders(userId);
  return (
    <Card className="rounded-3xl"><CardContent className="p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary"><Utensils className="h-5 w-5" /></div>
      <p className="mt-4 font-medium">Diet plan reminders</p><p className="mt-1 text-sm text-muted-foreground">Breakfast {DEFAULT_MEAL_TIMES.breakfast}, lunch {DEFAULT_MEAL_TIMES.lunch}, dinner {DEFAULT_MEAL_TIMES.dinner}. Updates instead of duplicating.</p>
      <Button className="mt-4 rounded-xl" onClick={() => create.mutate({ timezone }, { onSuccess: () => toast.success("Diet reminders synced") })} disabled={create.isPending}>Sync diet reminders</Button>
    </CardContent></Card>
  );
}

function HydrationCard({ userId, timezone, waterTarget, wakeTime, sleepTime }: { userId: string; timezone: string; waterTarget: number; wakeTime: string; sleepTime: string }) {
  const create = useCreateHydrationReminders(userId);
  const [intervalMinutes, setIntervalMinutes] = useState(120);
  return (
    <Card className="rounded-3xl"><CardContent className="p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary"><Droplets className="h-5 w-5" /></div>
      <p className="mt-4 font-medium">Hydration plan</p><p className="mt-1 text-sm text-muted-foreground">Distribute {waterTarget} ml between {wakeTime} and {sleepTime}; quiet hours still apply.</p>
      <div className="mt-4 flex flex-wrap items-end gap-2"><div><Label>Interval</Label><Select value={String(intervalMinutes)} onValueChange={(v) => setIntervalMinutes(Number(v))}><SelectTrigger className="mt-1 w-32 max-w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="60">1 hour</SelectItem><SelectItem value="90">90 min</SelectItem><SelectItem value="120">2 hours</SelectItem><SelectItem value="180">3 hours</SelectItem></SelectContent></Select></div><Button className="rounded-xl" onClick={() => create.mutate({ timezone, targetMl: waterTarget, wakeTime, sleepTime, intervalMinutes }, { onSuccess: () => toast.success("Hydration reminders synced") })} disabled={create.isPending}>Sync</Button></div>
    </CardContent></Card>
  );
}

function AutoWorkoutCard({ userId, timezone, planId }: { userId: string; timezone: string; planId?: string }) {
  const sync = useCreateWorkoutPlanReminders(userId);
  return (
    <Card className="rounded-3xl"><CardContent className="p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary"><Dumbbell className="h-5 w-5" /></div>
      <p className="mt-4 font-medium">Workout plan reminders</p>
      <p className="mt-1 text-sm text-muted-foreground">Create reminders from active workout days. Plan days update existing reminders instead of duplicating.</p>
      <Button className="mt-4 rounded-xl" disabled={!planId || sync.isPending} onClick={() => planId && sync.mutate({ planId, timezone }, { onSuccess: () => toast.success("Workout reminders synced") })}>Sync workout plan</Button>
    </CardContent></Card>
  );
}
function UpcomingList({ userId, items }: { userId: string; items: { r: Reminder; next: Date | null }[] }) {
  if (!items.length) return <Empty title="No upcoming reminders" subtitle="Create one or sync your plan to get started." />;
  return <div className="space-y-3">{items.map(({ r, next }) => <ReminderCard key={r.id} userId={userId} reminder={r} next={next} />)}</div>;
}

function ReminderCards({ userId, items, editable }: { userId: string; items: Reminder[]; editable?: boolean }) {
  if (!items.length) return <Empty title="Nothing here yet" subtitle={editable ? "Create your first manual reminder above." : "This section will fill in as reminders are scheduled."} />;
  return <div className="space-y-3">{items.map((r) => <ReminderCard key={r.id} userId={userId} reminder={r} next={nextOccurrence(r)} editable={editable} />)}</div>;
}

function ReminderCard({ userId, reminder: r, next, editable }: { userId: string; reminder: Reminder; next: Date | null; editable?: boolean }) {
  const update = useUpdateReminder(userId); const del = useDeleteReminder(userId); const snooze = useSnoozeReminder(userId); const recordEvent = useRecordReminderEvent(userId);
  const enabled = r.enabled ?? r.is_active; const rule = normalizeRule(r.recurrence_rule, r.days_of_week, r.is_recurring);
  return <Card className="rounded-3xl"><CardContent className="p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><Badge variant="secondary" className="max-w-full rounded-full">{typeLabel(r.type)}</Badge><Badge variant="outline" className="max-w-full rounded-full">{sourceLabel(r.source)}</Badge>{!enabled && <Badge variant="outline">Paused</Badge>}<p className="min-w-0 break-words font-medium [overflow-wrap:anywhere]">{r.title}</p></div>{r.message && <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>}<p className="mt-2 text-xs text-muted-foreground">{next ? `${formatWhen(next)} at ${next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No future time"} - {r.scheduled_time ?? r.times?.[0] ?? "--:--"} - {recurrenceLabel(rule)}</p></div><div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end"><Switch checked={enabled} onCheckedChange={(v) => update.mutate({ id: r.id, patch: { enabled: v } })} />{isExerciseReminder(r.type) && <Button asChild size="sm" className="max-w-full rounded-full" onClick={() => recordEvent.mutate({ reminderId: r.id, eventType: "started", metadata: { source: "reminder_card" } })}><Link to="/workout">Start workout</Link></Button>}
{SNOOZE_OPTIONS.map((m) => <Button key={m} size="sm" variant="outline" className="rounded-full" onClick={() => snooze.mutate({ id: r.id, minutes: m }, { onSuccess: () => toast.success(`Snoozed ${m} min`) })}>{m < 60 ? `${m}m` : "1h"}</Button>)}{editable && <EditReminderButton userId={userId} reminder={r} /> }<Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this reminder?")) del.mutate(r.id, { onSuccess: () => toast.success("Reminder deleted") }); }} aria-label={`Delete ${r.title}`}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></div></CardContent></Card>;
}

function CreateReminderCard({ userId, defaultTz }: { userId: string; defaultTz: string }) {
  const create = useCreateReminder(userId);
  const { track } = useGamification(userId);
  const [type, setType] = useState<ReminderType>("water");
  const [title, setTitle] = useState("Drink water");
  const [message, setMessage] = useState("");
  const [time, setTime] = useState("10:00");
  const [repeat, setRepeat] = useState("daily");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const canSave = Boolean(title.trim() && time);

  function saveReminder() {
    create.mutate(
      {
        type,
        title,
        message,
        scheduled_time: time,
        timezone: defaultTz,
        recurrence_rule: { frequency: repeat as never, days },
        source: "manual",
        created_by: "user",
        enabled: true,
      },
      {
        onSuccess: () => {
          toast.success("Reminder created");
          void track({ type: "reminder_created" });
          setTitle("");
          setMessage("");
        },
      },
    );
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Plus className="h-5 w-5" /> New reminder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ReminderType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{REMINDER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Message</Label>
          <Textarea className="mt-1" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Time</Label>
            <Input type="time" className="mt-1" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label>Repeat</Label>
            <Select value={repeat} onValueChange={setRepeat}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekends">Weekends</SelectItem>
                <SelectItem value="specific_days">Specific days</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {["specific_days", "custom"].includes(repeat) && (
          <div>
            <Label>Days</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => setDays((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort()))}
                  className={`rounded-full border px-3 py-1 text-xs ${days.includes(idx) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <Button className="w-full rounded-full" disabled={!canSave || create.isPending} onClick={saveReminder}>
          {create.isPending ? "Saving..." : "Create reminder"}
        </Button>
      </CardContent>
    </Card>
  );
}
function isExerciseReminder(type: string): boolean {
  return ["workout", "walking", "stretching", "cardio", "strength_training", "yoga", "recovery", "custom_exercise"].includes(type);
}
function EditReminderButton({ userId, reminder }: { userId: string; reminder: Reminder }) {
  const update = useUpdateReminder(userId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(reminder.title);
  const [time, setTime] = useState(reminder.scheduled_time ?? reminder.times?.[0] ?? "09:00");

  if (!editing) {
    return <Button variant="outline" size="sm" className="rounded-full" onClick={() => setEditing(true)}>Edit</Button>;
  }

  return (
    <span className="flex w-full min-w-0 flex-wrap items-center gap-1 sm:w-auto">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 min-w-[9rem] flex-1 sm:w-32 sm:flex-none" />
      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 min-w-[7.5rem] flex-1 sm:w-28 sm:flex-none" />
      <Button
        size="icon"
        className="h-9 w-9"
        onClick={() => update.mutate(
          { id: reminder.id, patch: { title, scheduled_time: time, times: [time] } },
          { onSuccess: () => { toast.success("Updated"); setEditing(false); } },
        )}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditing(false)}>
        <X className="h-4 w-4" />
      </Button>
    </span>
  );
}

function History({ userId, events }: { userId: string; events: Array<{ id: string; event_type: string; occurred_at: string; scheduled_for: string | null }> }) {
  const notifs = useQuery(notificationsQueryOptions(userId));
  const mark = useMarkNotification(userId);
  const { track } = useGamification(userId);

  return (
    <div className="space-y-3">
      {(notifs.data ?? []).map((n) => (
        <Card key={n.id} className={`rounded-2xl ${n.read_at ? "opacity-70" : ""}`}>
          <CardContent className="flex min-w-0 flex-col items-start justify-between gap-3 p-4 sm:flex-row">
            <div>
              <Badge variant="secondary" className="rounded-full">{typeLabel(n.type)}</Badge>
              <p className="mt-1 font-medium">{n.title}</p>
              {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.scheduled_for).toLocaleString()} - {n.action}</p>
            </div>
            {n.action === "pending" && (
              <div className="flex shrink-0 flex-wrap gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    mark.mutate({ id: n.id, patch: { action: "completed", read_at: new Date().toISOString() } });
                    void track({ type: "reminder_completed" });
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => mark.mutate({ id: n.id, patch: { action: "dismissed", read_at: new Date().toISOString() } })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {events.slice(0, 20).map((e) => (
        <p key={e.id} className="px-2 text-xs text-muted-foreground">{e.event_type} - {new Date(e.occurred_at).toLocaleString()}</p>
      ))}
    </div>
  );
}

function PreferencesCard({ userId }: { userId: string }) {
  const profile = useQuery(profileQueryOptions(userId));
  const update = useUpdateProfile(userId);
  const p = profile.data;
  if (!p) return null;

  return (
    <Card className="rounded-3xl">
      <CardHeader><CardTitle className="font-display text-lg">Notification preferences</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div><p className="font-medium">Enable notifications</p><p className="text-sm text-muted-foreground">Master switch for all reminders</p></div>
          <Switch checked={p.notifications_enabled !== false} onCheckedChange={(v) => update.mutate({ notifications_enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div><p className="font-medium">Notification sound</p><p className="text-sm text-muted-foreground">Play a sound when supported</p></div>
          <Switch checked={p.notification_sound !== false} onCheckedChange={(v) => update.mutate({ notification_sound: v })} />
        </div>
        <div>
          <Label>Timezone</Label>
          <Input className="mt-1 max-w-xs" value={p.timezone ?? ""} onChange={(e) => update.mutate({ timezone: e.target.value })} />
          <button type="button" className="mt-1 text-xs text-primary underline" onClick={() => update.mutate({ timezone: detectTimezone() })}>Detect automatically</button>
        </div>
        <div>
          <Label className="flex items-center gap-2"><Moon className="h-4 w-4" /> Quiet hours</Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input type="time" className="max-w-[140px]" value={p.quiet_hours_start ?? ""} onChange={(e) => update.mutate({ quiet_hours_start: e.target.value || null })} />
            <span className="text-sm text-muted-foreground">to</span>
            <Input type="time" className="max-w-[140px]" value={p.quiet_hours_end ?? ""} onChange={(e) => update.mutate({ quiet_hours_end: e.target.value || null })} />
            {(p.quiet_hours_start || p.quiet_hours_end) && <Button variant="ghost" size="sm" onClick={() => update.mutate({ quiet_hours_start: null, quiet_hours_end: null })}><BellOff className="mr-1 h-3.5 w-3.5" /> Clear</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card className="rounded-3xl border-dashed p-10 text-center">
      <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </Card>
  );
}



