import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  buildDietReminderDrafts,
  buildHydrationReminderDrafts,
  buildWorkoutPlanReminderDrafts,
  nextOccurrence,
  toInsertPayload,
  type ReminderDraft,
  type ReminderRow,
} from "@/lib/reminders";

export type Reminder = ReminderRow;
export type NotificationRow = Tables<"notifications">;
export type ReminderEvent = {
  id: string;
  user_id: string;
  reminder_id: string | null;
  event_type: "triggered" | "started" | "completed" | "snoozed" | "skipped" | "deleted" | "rescheduled";
  occurred_at: string;
  scheduled_for: string | null;
  metadata: Record<string, unknown>;
};

export const remindersQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["reminders", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<Reminder[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });

export const notificationsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async (): Promise<NotificationRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("scheduled_for", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

export const reminderEventsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["reminder-events", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ReminderEvent[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("reminder_events" as never)
        .select("*")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReminderEvent[];
    },
  });

export function useCreateReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: ReminderDraft) => {
      const payload = { ...toInsertPayload(draft), user_id: userId };
      const { data, error } = await supabase.from("reminders").insert(payload as never).select().single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useUpsertReminderDrafts(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (drafts: ReminderDraft[]) => {
      const rows = drafts.map((draft) => ({ ...toInsertPayload(draft), user_id: userId }));
      const { data, error } = await supabase
        .from("reminders")
        .upsert(rows as never, { onConflict: "user_id,source,source_id" })
        .select();
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useCreateDietPlanReminders(userId: string) {
  const upsert = useUpsertReminderDrafts(userId);
  return {
    ...upsert,
    mutate: (input: { timezone: string; mealTimes?: Parameters<typeof buildDietReminderDrafts>[1] }, options?: Parameters<typeof upsert.mutate>[1]) =>
      upsert.mutate(buildDietReminderDrafts(input.timezone, input.mealTimes), options),
    mutateAsync: (input: { timezone: string; mealTimes?: Parameters<typeof buildDietReminderDrafts>[1] }) =>
      upsert.mutateAsync(buildDietReminderDrafts(input.timezone, input.mealTimes)),
  };
}

export function useCreateHydrationReminders(userId: string) {
  const upsert = useUpsertReminderDrafts(userId);
  return {
    ...upsert,
    mutate: (input: Parameters<typeof buildHydrationReminderDrafts>[0], options?: Parameters<typeof upsert.mutate>[1]) =>
      upsert.mutate(buildHydrationReminderDrafts(input), options),
    mutateAsync: (input: Parameters<typeof buildHydrationReminderDrafts>[0]) =>
      upsert.mutateAsync(buildHydrationReminderDrafts(input)),
  };
}

export function useCreateWorkoutPlanReminders(userId: string) {
  const upsert = useUpsertReminderDrafts(userId);
  return {
    ...upsert,
    mutateAsync: async (input: { planId: string; timezone: string; defaultTime?: string }) => {
      const [{ data: plan, error: planError }, { data: days, error: daysError }] = await Promise.all([
        supabase.from("workout_plans").select("id,name,is_active").eq("id", input.planId).eq("user_id", userId).maybeSingle(),
        supabase.from("workout_plan_days").select("id,plan_id,day_index,title,focus,estimated_minutes").eq("plan_id", input.planId).eq("user_id", userId).order("day_index", { ascending: true }),
      ]);
      if (planError) throw planError;
      if (daysError) throw daysError;
      if (!plan) throw new Error("Workout plan not found.");
      const drafts = buildWorkoutPlanReminderDrafts({
        timezone: input.timezone,
        planId: plan.id,
        planName: plan.name,
        planActive: plan.is_active,
        days: days ?? [],
        defaultTime: input.defaultTime,
      });
      return upsert.mutateAsync(drafts);
    },
    mutate: (input: { planId: string; timezone: string; defaultTime?: string }, options?: Parameters<typeof upsert.mutate>[1]) => {
      void (async () => {
        const result = await (async () => {
          const [{ data: plan, error: planError }, { data: days, error: daysError }] = await Promise.all([
            supabase.from("workout_plans").select("id,name,is_active").eq("id", input.planId).eq("user_id", userId).maybeSingle(),
            supabase.from("workout_plan_days").select("id,plan_id,day_index,title,focus,estimated_minutes").eq("plan_id", input.planId).eq("user_id", userId).order("day_index", { ascending: true }),
          ]);
          if (planError) throw planError;
          if (daysError) throw daysError;
          if (!plan) throw new Error("Workout plan not found.");
          return buildWorkoutPlanReminderDrafts({ timezone: input.timezone, planId: plan.id, planName: plan.name, planActive: plan.is_active, days: days ?? [], defaultTime: input.defaultTime });
        })();
        upsert.mutate(result, options);
      })().catch((error) => options?.onError?.(error, [] as never, undefined as never));
    },
  };
}

export async function disableWorkoutPlanReminders(userId: string, planId: string) {
  const { error } = await supabase
    .from("reminders")
    .update({ enabled: false, is_active: false } as never)
    .eq("user_id", userId)
    .eq("source", "workout_plan" as never)
    .like("source_id", `workout-plan:${planId}:%`);
  if (error) throw error;
}
export function useUpdateReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"reminders"> & Record<string, unknown> }) => {
      const normalized = patch.enabled !== undefined ? { ...patch, is_active: patch.enabled } : patch;
      const { error } = await supabase.from("reminders").update(normalized as never).eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useDeleteReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await insertReminderEvent(userId, id, "deleted");
      const { error } = await supabase.from("reminders").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useMarkNotification(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"notifications"> }) => {
      const { error } = await supabase.from("notifications").update(patch).eq("id", id).eq("user_id", userId);
      if (error) throw error;
      if (patch.action === "completed" || patch.action === "dismissed" || patch.action === "snoozed") {
        const event = patch.action === "dismissed" ? "skipped" : patch.action;
        const n = await supabase.from("notifications").select("reminder_id, scheduled_for").eq("id", id).maybeSingle();
        await insertReminderEvent(userId, n.data?.reminder_id ?? null, event as ReminderEvent["event_type"], n.data?.scheduled_for ?? null);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      qc.invalidateQueries({ queryKey: ["reminder-events", userId] });
    },
  });
}

export function useRecordReminderEvent(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reminderId, eventType, metadata }: { reminderId: string; eventType: ReminderEvent["event_type"]; metadata?: Record<string, unknown> }) => {
      await insertReminderEvent(userId, reminderId, eventType, null, metadata);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminder-events", userId] }),
  });
}
export function useSnoozeReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await supabase
        .from("reminders")
        .update({ snooze_until: until, snoozed_until: until } as never)
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      await insertReminderEvent(userId, id, "snoozed", until, { minutes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", userId] });
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
      qc.invalidateQueries({ queryKey: ["reminder-events", userId] });
    },
  });
}

export async function refreshReminderNextTriggers(userId: string, reminders: Reminder[]) {
  await Promise.all(
    reminders.map((r) => {
      const next = nextOccurrence(r);
      if ((r.next_trigger_at ?? null) === (next?.toISOString() ?? null)) return Promise.resolve();
      return supabase
        .from("reminders")
        .update({ next_trigger_at: next?.toISOString() ?? null } as never)
        .eq("id", r.id)
        .eq("user_id", userId);
    }),
  );
}

async function insertReminderEvent(
  userId: string,
  reminderId: string | null,
  eventType: ReminderEvent["event_type"],
  scheduledFor?: string | null,
  metadata?: Record<string, unknown>,
) {
  await supabase.from("reminder_events" as never).insert({
    user_id: userId,
    reminder_id: reminderId,
    event_type: eventType,
    scheduled_for: scheduledFor ?? null,
    metadata: metadata ?? {},
  } as never);
}

export type LegacyReminderInsert = Omit<TablesInsert<"reminders">, "user_id">;



