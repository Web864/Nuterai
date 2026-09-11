import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileQueryOptions } from "@/features/goals/queries";
import { remindersQueryOptions, refreshReminderNextTriggers, type Reminder } from "./queries";
import { detectTimezone, inQuietHours, nextOccurrence, notificationCopy, typeLabel } from "@/lib/reminders";
import { isNative } from "@/lib/native";

const WEB_TICK_MS = 60_000;
const LOOKAHEAD_MS = 75_000;
const NATIVE_HORIZON_DAYS = 7;

export function useReminderEngine(userId: string | undefined) {
  const qc = useQueryClient();
  const profileQ = useQuery(profileQueryOptions(userId));
  const remindersQ = useQuery(remindersQueryOptions(userId));
  const firedRef = useRef<Set<string>>(new Set());
  const timezoneSyncedRef = useRef<string | undefined>(undefined);

  const reminders = useMemo(() => (remindersQ.data ?? []) as Reminder[], [remindersQ.data]);

  useEffect(() => {
    if (!userId || !profileQ.data) return;
    if (timezoneSyncedRef.current === userId) return;
    const detected = detectTimezone();
    if (!profileQ.data.timezone || profileQ.data.timezone === "UTC") {
      timezoneSyncedRef.current = userId;
      void supabase.from("profiles").update({ timezone: detected }).eq("id", userId);
    }
  }, [userId, profileQ.data]);

  useEffect(() => {
    if (!userId || !reminders.length) return;
    void refreshReminderNextTriggers(userId, reminders);
  }, [userId, reminders]);

  useEffect(() => {
    if (!userId) return;
    const profile = profileQ.data;
    if (!reminders.length) return;
    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      const now = new Date();
      const tz = profile?.timezone || detectTimezone();
      const notifEnabled = profile?.notifications_enabled !== false;

      for (const r of reminders) {
        const next = nextOccurrence(r, now);
        if (!next) continue;
        const delta = next.getTime() - now.getTime();
        if (delta > LOOKAHEAD_MS) continue;

        const slotIso = next.toISOString();
        const dedupeKey = `${r.id}:${slotIso}`;
        if (firedRef.current.has(dedupeKey)) continue;

        const message = r.message ?? notificationCopy(r.type, r.title, slotIso.length);
        const { data: inserted, error } = await supabase
          .from("notifications")
          .insert({
            user_id: userId,
            reminder_id: r.id,
            type: r.type,
            title: r.title,
            body: message,
            scheduled_for: slotIso,
            delivered_at: new Date().toISOString(),
            action: "pending",
          })
          .select()
          .maybeSingle();

        if (error && error.code !== "23505") continue;
        firedRef.current.add(dedupeKey);
        if (!inserted) continue;

        await supabase.from("reminder_events" as never).insert({
          user_id: userId,
          reminder_id: r.id,
          event_type: "triggered",
          scheduled_for: slotIso,
          metadata: { channel: "web" },
        } as never);

        const quiet = inQuietHours(next, tz, profile?.quiet_hours_start, profile?.quiet_hours_end);
        if (notifEnabled && !quiet && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(r.title, { body: message, tag: r.id, icon: "/apple-touch-icon.png" });
            n.onclick = () => {
              window.focus();
              window.location.href = "/reminders";
              n.close();
            };
          } catch {
            // Browser notification failures are reflected by in-app history.
          }
        }

        await supabase
          .from("reminders")
          .update({ last_triggered_at: slotIso, next_trigger_at: nextOccurrence(r, new Date(next.getTime() + 1000))?.toISOString() ?? null } as never)
          .eq("id", r.id)
          .eq("user_id", userId);
        qc.invalidateQueries({ queryKey: ["notifications", userId] });
        qc.invalidateQueries({ queryKey: ["reminder-events", userId] });
      }
    }

    void tick();
    const t = setInterval(tick, WEB_TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [userId, reminders, profileQ.data, qc]);

  useEffect(() => {
    if (!isNative || !userId) return;
    const profile = profileQ.data;
    let cancelled = false;

    async function syncNativeSchedule() {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted" || cancelled) return;

      const pending = await LocalNotifications.getPending();
      const expected = buildNativeNotifications(reminders, profile);
      const expectedIds = new Set(expected.map((n) => n.id));
      const stale = pending.notifications.filter((n) => isNutriReminderId(n.id) && !expectedIds.has(n.id));
      if (stale.length) await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });

      const pendingIds = new Set(pending.notifications.map((n) => n.id));
      const missing = expected.filter((n) => !pendingIds.has(n.id));
      if (missing.length) await LocalNotifications.schedule({ notifications: missing });
    }

    void syncNativeSchedule();
    return () => {
      cancelled = true;
    };
  }, [userId, reminders, profileQ.data]);
}

function buildNativeNotifications(reminders: Reminder[], profile: Awaited<ReturnType<typeof profileQueryOptions>>["queryFn"] extends () => Promise<infer T> ? T : never) {
  if (profile?.notifications_enabled === false) return [];
  const tz = profile?.timezone || detectTimezone();
  const result: Array<{ id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle: true }; extra: { reminderId: string; source: string } }> = [];
  const horizon = Date.now() + NATIVE_HORIZON_DAYS * 86_400_000;

  for (const r of reminders) {
    let from = new Date();
    for (let i = 0; i < 16; i++) {
      const next = nextOccurrence(r, from);
      if (!next || next.getTime() > horizon) break;
      if (!inQuietHours(next, tz, profile?.quiet_hours_start, profile?.quiet_hours_end)) {
        result.push({
          id: notificationId(r.id, next),
          title: r.title,
          body: r.message ?? notificationCopy(r.type, r.title, i),
          schedule: { at: next, allowWhileIdle: true },
          extra: { reminderId: r.id, source: "nutriai-reminder" },
        });
      }
      from = new Date(next.getTime() + 1000);
    }
  }
  return result;
}

function notificationId(reminderId: string, at: Date): number {
  const key = `nutriai:${reminderId}:${at.toISOString()}`;
  let hash = 17;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return 1_000_000_000 + (Math.abs(hash) % 1_000_000_000);
}

function isNutriReminderId(id: number): boolean {
  return id >= 1_000_000_000 && id < 2_000_000_000;
}

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (isNative) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    return current.display === "granted" ? "granted" : current.display === "denied" ? "denied" : "default";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNative) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    const result = current.display === "prompt" || current.display === "prompt-with-rationale" ? await LocalNotifications.requestPermissions() : current;
    return result.display === "granted" ? "granted" : result.display === "denied" ? "denied" : "default";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}
