import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, Json } from "@/integrations/supabase/types";

export type WorkoutPlan = Tables<"workout_plans">;
export type WorkoutPlanDay = Tables<"workout_plan_days">;
export type WorkoutSession = Tables<"workout_sessions">;

export type PlanExercise = {
  name: string;
  muscle_group?: string;
  sets: number;
  reps: number | string;
  rest_seconds?: number;
  weight_kg?: number | null;
  notes?: string;
};

export type SessionExercise = PlanExercise & {
  completed_sets?: number;
  actual_reps?: number;
  actual_weight_kg?: number | null;
};

// ---------- Plans ----------
export const plansQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["workout-plans", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WorkoutPlan[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const planDaysQueryOptions = (planId: string | undefined) =>
  queryOptions({
    queryKey: ["workout-plan-days", planId],
    enabled: !!planId,
    queryFn: async (): Promise<WorkoutPlanDay[]> => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from("workout_plan_days")
        .select("*")
        .eq("plan_id", planId)
        .order("day_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export function useSetActivePlan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      await supabase.from("workout_plans").update({ is_active: false }).eq("user_id", userId);
      const { error } = await supabase
        .from("workout_plans")
        .update({ is_active: true })
        .eq("id", planId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-plans", userId] }),
  });
}

export function useDeletePlan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-plans", userId] }),
  });
}

// ---------- Sessions ----------
export const sessionsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["workout-sessions", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WorkoutSession[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export function useLogSession(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<TablesInsert<"workout_sessions">, "user_id">) => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workout-sessions", userId] });
    },
  });
}

export function useDeleteSession(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workout-sessions", userId] }),
  });
}

// ---------- Helpers ----------
export function parseExercises(json: Json | null | undefined): PlanExercise[] {
  if (!Array.isArray(json)) return [];
  return json as unknown as PlanExercise[];
}

export function estimateCalories(
  minutes: number,
  intensity: "low" | "moderate" | "high" = "moderate",
): number {
  const rate = intensity === "high" ? 10 : intensity === "low" ? 5 : 7.5;
  return Math.round(minutes * rate);
}
