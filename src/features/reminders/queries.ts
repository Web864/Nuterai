import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Reminder = Tables<"reminders">;
export type NotificationRow = Tables<"notifications">;

export const remindersQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["reminders", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Reminder[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
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
    refetchInterval: 30_000,
  });

export function useCreateReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TablesInsert<"reminders">, "user_id">) => {
      const { data, error } = await supabase
        .from("reminders")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useUpdateReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"reminders"> }) => {
      const { error } = await supabase.from("reminders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useDeleteReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders", userId] }),
  });
}

export function useMarkNotification(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"notifications">;
    }) => {
      const { error } = await supabase.from("notifications").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });
}

export function useSnoozeReminder(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const until = new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await supabase.from("reminders").update({ snooze_until: until }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", userId] });
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });
}
