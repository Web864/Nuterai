import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PluginListenerHandle } from "@capacitor/core";
import type { LocalNotificationSchema } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { profileQueryOptions } from "@/features/goals/queries";
import { remindersQueryOptions, type Reminder } from "./queries";
import {
  detectTimezone,
  inQuietHours,
  nextOccurrence,
  notificationCopy,
  typeLabel,
} from "@/lib/reminders";
import { isNative } from "@/lib/native";

const WEB_TICK_MS = 60_000;
const LOOKAHEAD_MS = 75_000;
const NATIVE_HORIZON_DAYS = 7;
const MAX_OCCURRENCES_PER_REMINDER = NATIVE_HORIZON_DAYS * 24 * 60 + 1;
const NUTRIAI_REMINDER_CHANNEL_ID = "nutriai_reminders";
let reminderEngineMounts = 0;

export type ExactAlarmAccess = "granted" | "denied" | "unavailable";

function notificationPermission(display: string): NotificationPermission {
  return display === "granted" ? "granted" : display === "denied" ? "denied" : "default";
}

function devLog(level: "info" | "warn" | "error", event: string, details: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  console[level](event, details);
}

export function useReminderEngine(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    reminderEngineMounts += 1;
    console.info("[reminder.engine.lifecycle]", {
      state: "mounted",
      count: reminderEngineMounts,
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
    return () =>
      console.info("[reminder.engine.lifecycle]", {
        state: "unmounted",
        count: reminderEngineMounts,
        route: window.location.pathname,
        timestamp: new Date().toISOString(),
      });
  }, []);
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
    if (!userId) return;
    const activeUserId = userId;
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
            user_id: activeUserId,
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
        if (
          notifEnabled &&
          !quiet &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            const n = new Notification(r.title, {
              body: message,
              tag: r.id,
              icon: "/apple-touch-icon.png",
            });
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
          .update({
            last_triggered_at: slotIso,
            next_trigger_at:
              nextOccurrence(r, new Date(next.getTime() + 1000))?.toISOString() ?? null,
          } as never)
          .eq("id", r.id)
          .eq("user_id", activeUserId);
        qc.invalidateQueries({ queryKey: ["notifications", activeUserId] });
        qc.invalidateQueries({ queryKey: ["reminder-events", activeUserId] });
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
    let listener: { remove: () => Promise<void> } | undefined;
    let cancelled = false;

    async function listenForNotificationActions() {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const registration = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        () => {
          if (cancelled || typeof window === "undefined") return;
          window.location.assign("/reminders");
        },
      );
      if (cancelled) {
        await registration.remove();
      } else {
        listener = registration;
      }
    }

    void listenForNotificationActions();
    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [userId]);

  useEffect(() => {
    if (!isNative || !userId) return;
    const profile = profileQ.data;
    let cancelled = false;
    let appListener: PluginListenerHandle | undefined;

    async function syncNativeSchedule() {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted" || cancelled) return;
      const exact = await LocalNotifications.checkExactNotificationSetting();
      if (exact.exact_alarm !== "granted" || cancelled) {
        devLog("warn", "[reminder.native.sync]", {
          status: "exact-alarm-not-granted",
          exactAlarm: exact.exact_alarm,
        });
        return;
      }
      await LocalNotifications.createChannel({
        id: NUTRIAI_REMINDER_CHANNEL_ID,
        name: "NutriAI Reminders",
        description: "Meal, hydration, workout and nutrition reminders",
        importance: 4,
        vibration: true,
      });

      const pending = await LocalNotifications.getPending();
      const expected = buildNativeNotifications(reminders, profile);
      const expectedIds = new Set(expected.map((n) => n.id));
      const stale = pending.notifications.filter(
        (n) => isNutriReminderId(n.id) && !expectedIds.has(n.id),
      );
      if (stale.length)
        await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) });

      const pendingIds = new Set(pending.notifications.map((n) => n.id));
      const missing = expected.filter((n) => !pendingIds.has(n.id));
      if (missing.length) {
        const scheduled = await LocalNotifications.schedule({ notifications: missing });
        devLog(scheduled.warning ? "warn" : "info", "[reminder.native.schedule]", {
          expected: expected.length,
          requested: missing.length,
          scheduled: scheduled.notifications.length,
          warning: scheduled.warning?.code ?? null,
        });
      }
      const verified = await LocalNotifications.getPending();
      const verifiedIds = new Set(verified.notifications.map((notification) => notification.id));
      const failed = expected.filter((notification) => !verifiedIds.has(notification.id)).length;
      devLog(failed ? "warn" : "info", "[reminder.native.verify]", {
        expected: expected.length,
        failed,
        staleRemoved: stale.length,
      });
    }

    async function startNativeSync() {
      await syncNativeSchedule();
      const { App } = await import("@capacitor/app");
      const registration = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive && !cancelled) void syncNativeSchedule();
      });
      if (cancelled) await registration.remove();
      else appListener = registration;
    }

    void startNativeSync();
    return () => {
      cancelled = true;
      void appListener?.remove();
    };
  }, [userId, reminders, profileQ.data]);
}

export function buildNativeNotifications(
  reminders: Reminder[],
  profile:
    | Pick<
        Tables<"profiles">,
        "notifications_enabled" | "timezone" | "quiet_hours_start" | "quiet_hours_end"
      >
    | null
    | undefined,
): LocalNotificationSchema[] {
  if (profile?.notifications_enabled === false) return [];
  const tz = profile?.timezone || detectTimezone();
  const result: LocalNotificationSchema[] = [];
  const horizon = Date.now() + NATIVE_HORIZON_DAYS * 86_400_000;

  for (const reminder of reminders) {
    let from = new Date();
    let occurrence = 0;
    while (occurrence < MAX_OCCURRENCES_PER_REMINDER) {
      const next = nextOccurrence(reminder, from);
      if (!next || next.getTime() > horizon) break;
      if (!inQuietHours(next, tz, profile?.quiet_hours_start, profile?.quiet_hours_end)) {
        result.push({
          id: notificationId(reminder.id, next),
          title: reminder.title,
          body: reminder.message ?? notificationCopy(reminder.type, reminder.title, occurrence),
          schedule: { at: next, allowWhileIdle: true },
          extra: { reminderId: reminder.id, source: "nutriai-reminder" },
          channelId: NUTRIAI_REMINDER_CHANNEL_ID,
          isExactNotification: true,
          isExactMandatory: true,
          smallIcon: "ic_stat_nutriai",
          iconColor: "#0F3D2E",
        });
      }
      occurrence += 1;
      from = new Date(next.getTime() + 1000);
    }
    if (occurrence === MAX_OCCURRENCES_PER_REMINDER) {
      devLog("warn", "[reminder.native.schedule.guard]", {
        reminderId: reminder.id,
        maxOccurrences: MAX_OCCURRENCES_PER_REMINDER,
      });
    }
  }
  return result;
}

export function notificationId(reminderId: string, at: Date): number {
  const key = `nutriai:${reminderId}:${at.toISOString()}`;
  let hash = 17;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return 1_000_000_000 + (Math.abs(hash) % 1_000_000_000);
}

function isNutriReminderId(id: number): boolean {
  return id >= 1_000_000_000 && id < 2_000_000_000;
}

export async function checkNativeExactAlarmAccess(): Promise<ExactAlarmAccess> {
  if (!isNative) return "unavailable";
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  try {
    const setting = await LocalNotifications.checkExactNotificationSetting();
    return setting.exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

export async function requestNativeExactAlarmAccess(): Promise<ExactAlarmAccess> {
  if (!isNative) return "unavailable";
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  try {
    const setting = await LocalNotifications.changeExactNotificationSetting();
    return setting.exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (isNative) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    return current.display === "granted"
      ? "granted"
      : current.display === "denied"
        ? "denied"
        : "default";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNative) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const current = await LocalNotifications.checkPermissions();
    const result =
      current.display === "prompt" || current.display === "prompt-with-rationale"
        ? await LocalNotifications.requestPermissions()
        : current;
    return result.display === "granted"
      ? "granted"
      : result.display === "denied"
        ? "denied"
        : "default";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied")
    return Notification.permission;
  return await Notification.requestPermission();
}
