import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { profileQueryOptions } from "@/features/goals/queries";
import { remindersQueryOptions, type Reminder } from "./queries";
import { nextOccurrence, inQuietHours, typeLabel, detectTimezone } from "@/lib/reminders";

const TICK_MS = 30_000;
const LOOKAHEAD_MS = 60_000; // fire notifications up to 60s ahead of scheduled_for

/**
 * Client-side reminder engine.
 * - Requests Notification permission on demand.
 * - Every 30s, computes next occurrence for each active reminder.
 * - If due within LOOKAHEAD_MS and no notification row exists for that slot,
 *   inserts a notifications row and fires the browser Notification API
 *   (respecting quiet hours + user preference).
 * - Auto-detects and persists user's timezone on profile if missing.
 */
export function useReminderEngine(userId: string | undefined) {
  const qc = useQueryClient();
  const profileQ = useQuery(profileQueryOptions(userId));
  const remindersQ = useQuery(remindersQueryOptions(userId));
  const firedRef = useRef<Set<string>>(new Set());

  // Persist detected timezone once.
  useEffect(() => {
    if (!userId || !profileQ.data) return;
    const detected = detectTimezone();
    if (!profileQ.data.timezone || profileQ.data.timezone === "UTC") {
      void supabase.from("profiles").update({ timezone: detected }).eq("id", userId);
    }
  }, [userId, profileQ.data]);

  useEffect(() => {
    if (!userId) return;
    const reminders = remindersQ.data ?? [];
    const profile = profileQ.data;
    if (!reminders.length) return;

    let cancelled = false;

    async function tick() {
      if (cancelled) return;
      const now = new Date();
      const tz = profile?.timezone || detectTimezone();
      const notifEnabled = profile?.notifications_enabled !== false;

      for (const r of reminders as Reminder[]) {
        const next = nextOccurrence(r as any, now);
        if (!next) continue;
        const delta = next.getTime() - now.getTime();
        if (delta > LOOKAHEAD_MS) continue;

        const slotIso = next.toISOString();
        const dedupeKey = `${r.id}:${slotIso}`;
        if (firedRef.current.has(dedupeKey)) continue;

        // Insert notification row (unique index handles duplicates)
        const { data: inserted, error } = await supabase
          .from("notifications")
          .insert({
            user_id: userId!,
            reminder_id: r.id,
            type: r.type,
            title: r.title,
            body: r.message,
            scheduled_for: slotIso,
            delivered_at: new Date().toISOString(),
            action: "pending",
          })
          .select()
          .maybeSingle();

        // If insert conflicted (already exists), skip firing again
        if (error && error.code !== "23505") {
          continue;
        }
        firedRef.current.add(dedupeKey);
        if (!inserted) continue;

        // Fire browser notification when allowed
        const inQuiet = inQuietHours(now, tz, profile?.quiet_hours_start, profile?.quiet_hours_end);
        if (
          notifEnabled &&
          !inQuiet &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            const n = new Notification(r.title, {
              body: r.message ?? typeLabel(r.type),
              tag: r.id,
              icon: "/apple-touch-icon.png",
            });
            n.onclick = () => {
              window.focus();
              window.location.href = "/reminders";
              n.close();
            };
          } catch {
            /* ignore */
          }
        }

        qc.invalidateQueries({ queryKey: ["notifications", userId] });
      }
    }

    void tick();
    const t = setInterval(tick, TICK_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [userId, remindersQ.data, profileQ.data, qc]);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  return await Notification.requestPermission();
}
