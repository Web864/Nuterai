import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route as AuthedRoute } from "./route";
import {
  remindersQueryOptions,
  notificationsQueryOptions,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
  useMarkNotification,
  useSnoozeReminder,
  type Reminder,
} from "@/features/reminders/queries";
import { profileQueryOptions, useUpdateProfile } from "@/features/goals/queries";
import { requestNotificationPermission } from "@/features/reminders/useReminderEngine";
import { detectTimezone, nextOccurrence, typeLabel, formatWhen } from "@/lib/reminders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, Plus, Trash2, Check, Moon, X, Clock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({
    meta: [
      { title: "Reminders — NutriAI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RemindersPage,
});

const REMINDER_TYPES = [
  { value: "meal", label: "Meal" },
  { value: "workout", label: "Workout" },
  { value: "water", label: "Water" },
  { value: "weight", label: "Weight check" },
  { value: "sleep", label: "Sleep" },
  { value: "medication", label: "Medication" },
  { value: "custom", label: "Custom" },
] as const;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function RemindersPage() {
  const { userId } = AuthedRoute.useRouteContext();
  const reminders = useQuery(remindersQueryOptions(userId));
  const notifications = useQuery(notificationsQueryOptions(userId));
  const profile = useQuery(profileQueryOptions(userId));

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied",
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return (reminders.data ?? [])
      .filter((r) => r.is_active)
      .map((r) => ({ r, next: nextOccurrence(r as any, now) }))
      .filter((x) => x.next)
      .sort((a, b) => (a.next!.getTime() - b.next!.getTime()))
      .slice(0, 20);
  }, [reminders.data]);

  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <span className="font-display text-lg">Reminders</span>
            {unread > 0 && <Badge variant="destructive" className="rounded-full">{unread}</Badge>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {permission !== "granted" && (
          <Card className="mb-6 rounded-3xl border-accent/40 bg-accent/5">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Enable browser notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get alerts even when the app tab is in the background.
                </p>
              </div>
              <Button
                onClick={async () => {
                  const p = await requestNotificationPermission();
                  setPermission(p);
                  if (p === "granted") toast.success("Notifications enabled");
                  else toast.error("Permission not granted");
                }}
                disabled={permission === "denied"}
                className="rounded-full"
              >
                <Bell className="mr-2 h-4 w-4" />
                {permission === "denied" ? "Blocked in browser" : "Enable"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="rounded-full">
            <TabsTrigger value="upcoming" className="rounded-full">Upcoming</TabsTrigger>
            <TabsTrigger value="all" className="rounded-full">All reminders</TabsTrigger>
            <TabsTrigger value="history" className="rounded-full">
              History {unread > 0 && <span className="ml-1 rounded-full bg-primary/20 px-1.5 text-xs">{unread}</span>}
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-full">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <UpcomingList userId={userId} items={upcoming} />
          </TabsContent>

          <TabsContent value="all" className="mt-6 space-y-6">
            <CreateReminderCard userId={userId} defaultTz={profile.data?.timezone ?? detectTimezone()} />
            <ReminderList userId={userId} reminders={reminders.data ?? []} />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <NotificationHistory userId={userId} />
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <PreferencesCard userId={userId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ------------- Upcoming -------------
function UpcomingList({
  userId,
  items,
}: {
  userId: string;
  items: { r: Reminder; next: Date | null }[];
}) {
  const snooze = useSnoozeReminder(userId);
  if (items.length === 0) {
    return (
      <Card className="rounded-3xl border-dashed p-10 text-center">
        <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No upcoming reminders</p>
        <p className="text-sm text-muted-foreground">Create one to get started.</p>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {items.map(({ r, next }) => (
        <Card key={r.id} className="rounded-3xl">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full">{typeLabel(r.type)}</Badge>
                <p className="truncate font-medium">{r.title}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {next ? formatWhen(next) : "—"} · {next?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                snooze.mutate(
                  { id: r.id, minutes: 15 },
                  { onSuccess: () => toast.success("Snoozed 15 min") },
                )
              }
            >
              <Moon className="mr-1.5 h-3.5 w-3.5" /> Snooze
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ------------- Create -------------
function CreateReminderCard({ userId, defaultTz }: { userId: string; defaultTz: string }) {
  const create = useCreateReminder(userId);
  const [type, setType] = useState<Reminder["type"]>("water");
  const [title, setTitle] = useState("Drink water");
  const [message, setMessage] = useState<string>("");
  const [times, setTimes] = useState<string[]>(["09:00", "13:00", "17:00"]);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [recurring, setRecurring] = useState(true);
  const [oneTime, setOneTime] = useState<string>("");

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }
  function updateTime(i: number, v: string) {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? v : t)));
  }

  const canSave = title.trim().length > 0 && (recurring ? times.length > 0 : oneTime.length > 0);

  function handleSave() {
    create.mutate(
      {
        type,
        title: title.trim(),
        message: message.trim() || null,
        times: recurring ? times : [],
        days_of_week: recurring ? days : [0, 1, 2, 3, 4, 5, 6],
        timezone: defaultTz,
        is_active: true,
        is_recurring: recurring,
        one_time_at: recurring ? null : new Date(oneTime).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Reminder created");
          setTitle("");
          setMessage("");
        },
        onError: (e: any) => toast.error(e.message ?? "Failed"),
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
            <Select value={type} onValueChange={(v) => setType(v as Reminder["type"])}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Log breakfast" />
          </div>
        </div>
        <div>
          <Label>Message (optional)</Label>
          <Textarea className="mt-1" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Recurring</p>
            <p className="text-xs text-muted-foreground">Repeat on a schedule</p>
          </div>
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </div>

        {recurring ? (
          <>
            <div>
              <Label>Times of day</Label>
              <div className="mt-2 space-y-2">
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} className="max-w-[160px]" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTimes((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={times.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setTimes((p) => [...p, "12:00"])}>
                  <Plus className="mr-1 h-3 w-3" /> Add time
                </Button>
              </div>
            </div>
            <div>
              <Label>Days</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((label, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      days.includes(idx)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <Label>Date & time</Label>
            <Input
              type="datetime-local"
              className="mt-1 max-w-xs"
              value={oneTime}
              onChange={(e) => setOneTime(e.target.value)}
            />
          </div>
        )}

        <Button className="w-full rounded-full" disabled={!canSave || create.isPending} onClick={handleSave}>
          {create.isPending ? "Saving…" : "Create reminder"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ------------- List / Edit -------------
function ReminderList({ userId, reminders }: { userId: string; reminders: Reminder[] }) {
  const update = useUpdateReminder(userId);
  const del = useDeleteReminder(userId);

  if (reminders.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No reminders yet.</p>;
  }
  return (
    <div className="space-y-3">
      {reminders.map((r) => (
        <Card key={r.id} className="rounded-3xl">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">{typeLabel(r.type)}</Badge>
                  <p className="font-medium">{r.title}</p>
                  {!r.is_active && <Badge variant="outline">Paused</Badge>}
                </div>
                {r.message && <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.is_recurring
                    ? `${r.times.join(", ") || "no times"} · ${
                        r.days_of_week?.length === 7 ? "every day" : r.days_of_week.map((d) => DAYS[d]).join(", ")
                      }`
                    : r.one_time_at
                    ? new Date(r.one_time_at).toLocaleString()
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={r.is_active}
                  onCheckedChange={(v) => update.mutate({ id: r.id, patch: { is_active: v } })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("Delete this reminder?")) {
                      del.mutate(r.id, { onSuccess: () => toast.success("Deleted") });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ------------- History -------------
function NotificationHistory({ userId }: { userId: string }) {
  const notifs = useQuery(notificationsQueryOptions(userId));
  const mark = useMarkNotification(userId);
  const { track } = useGamification(userId);
  const data = notifs.data ?? [];
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((n) => (
        <Card key={n.id} className={`rounded-2xl ${n.read_at ? "opacity-70" : ""}`}>
          <CardContent className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full">{typeLabel(n.type)}</Badge>
                <p className="font-medium">{n.title}</p>
              </div>
              {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.scheduled_for).toLocaleString()} · {n.action}
              </p>
            </div>
            <div className="flex gap-1">
              {n.action === "pending" ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    mark.mutate({
                      id: n.id,
                      patch: { action: "completed", read_at: new Date().toISOString() },
                    });
                    void track({ type: "reminder_completed" });
                  }}
                  aria-label="Mark completed"
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                !n.read_at && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => mark.mutate({ id: n.id, patch: { read_at: new Date().toISOString() } })}
                    aria-label="Mark read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )
              )}
              {n.action === "pending" && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    mark.mutate({
                      id: n.id,
                      patch: { action: "dismissed", read_at: new Date().toISOString() },
                    })
                  }
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ------------- Preferences -------------
function PreferencesCard({ userId }: { userId: string }) {
  const profile = useQuery(profileQueryOptions(userId));
  const update = useUpdateProfile(userId);
  const p = profile.data;
  if (!p) return null;
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="font-display text-lg">Notification preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable notifications</p>
            <p className="text-sm text-muted-foreground">Master switch for all reminders</p>
          </div>
          <Switch
            checked={p.notifications_enabled !== false}
            onCheckedChange={(v) => update.mutate({ notifications_enabled: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Notification sound</p>
            <p className="text-sm text-muted-foreground">Play a sound when supported</p>
          </div>
          <Switch
            checked={p.notification_sound !== false}
            onCheckedChange={(v) => update.mutate({ notification_sound: v })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Timezone</Label>
            <Input
              className="mt-1"
              value={p.timezone ?? ""}
              onChange={(e) => update.mutate({ timezone: e.target.value })}
              placeholder="e.g. America/New_York"
            />
            <button
              type="button"
              className="mt-1 text-xs text-primary underline"
              onClick={() => update.mutate({ timezone: detectTimezone() })}
            >
              Detect automatically
            </button>
          </div>
        </div>
        <div>
          <Label className="flex items-center gap-2"><Moon className="h-4 w-4" /> Quiet hours</Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              type="time"
              className="max-w-[140px]"
              value={p.quiet_hours_start ?? ""}
              onChange={(e) => update.mutate({ quiet_hours_start: e.target.value || null })}
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="time"
              className="max-w-[140px]"
              value={p.quiet_hours_end ?? ""}
              onChange={(e) => update.mutate({ quiet_hours_end: e.target.value || null })}
            />
            {(p.quiet_hours_start || p.quiet_hours_end) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => update.mutate({ quiet_hours_start: null, quiet_hours_end: null })}
              >
                <BellOff className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            No browser notifications during this window. Reminders are still recorded to history.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
