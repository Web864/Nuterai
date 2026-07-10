import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CoachThread = Tables<"coach_threads">;
export type CoachMessage = Tables<"coach_messages">;

export const threadsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["coach-threads", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CoachThread[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("coach_threads")
        .select("*")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const messagesQueryOptions = (threadId: string | undefined) =>
  queryOptions({
    queryKey: ["coach-messages", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<CoachMessage[]> => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("coach_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export function useCreateThread(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string): Promise<CoachThread> => {
      const { data, error } = await supabase
        .from("coach_threads")
        .insert({ user_id: userId, title: title ?? "New conversation" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-threads", userId] }),
  });
}

export function useDeleteThread(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coach_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-threads", userId] }),
  });
}

export function useRenameThread(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("coach_threads")
        .update({ title })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach-threads", userId] }),
  });
}
