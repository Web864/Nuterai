import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type UserGoals = Tables<"user_goals">;

export const profileQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const goalsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["goals", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserGoals | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"profiles">) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });
}

export function useUpsertGoals(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserGoals>) => {
      const { data, error } = await supabase
        .from("user_goals")
        .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", userId] }),
  });
}
