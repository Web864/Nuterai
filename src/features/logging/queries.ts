import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logQueryExecution } from "@/lib/query-debug";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { sumNutritionSnapshots } from "@/features/logging/nutrition-summary";

export type MealEntry = Tables<"meal_entries">;
export type WaterLog = Tables<"water_logs">;
export type WeightLog = Tables<"weight_logs">;

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateDaysBefore(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day - days);
  const nextYear = value.getFullYear();
  const nextMonth = String(value.getMonth() + 1).padStart(2, "0");
  const nextDay = String(value.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export const mealsDateRangeQueryOptions = (
  userId: string | undefined,
  startDate: string,
  endDate: string,
) =>
  queryOptions({
    queryKey: ["meals", userId, "range", startDate, endDate],
    enabled: !!userId,
    queryFn: async (): Promise<MealEntry[]> => {
      if (!userId) return [];
      logQueryExecution("meals", "mealsDateRangeQueryOptions");
      const { data, error } = await supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("logged_date", startDate)
        .lte("logged_date", endDate)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
// ---------- Meals ----------
export const mealsTodayQueryOptions = (userId: string | undefined, date: string) =>
  queryOptions({
    queryKey: ["meals", userId, date],
    enabled: !!userId,
    queryFn: async (): Promise<MealEntry[]> => {
      if (!userId) return [];
      logQueryExecution("meals", "mealsTodayQueryOptions");
      const { data, error } = await supabase
        .from("meal_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("logged_date", date)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export function useAddMeal(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (meal: Omit<TablesInsert<"meal_entries">, "user_id">) => {
      const { data, error } = await supabase
        .from("meal_entries")
        .insert({ ...meal, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals", userId] }),
  });
}

export function useDeleteMeal(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals", userId] }),
  });
}

// ---------- Water ----------
export const waterTodayQueryOptions = (userId: string | undefined, date: string) =>
  queryOptions({
    queryKey: ["water", userId, date],
    enabled: !!userId,
    queryFn: async (): Promise<WaterLog[]> => {
      if (!userId) return [];
      logQueryExecution("water", "waterTodayQueryOptions");
      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("logged_date", date)
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export function useAddWater(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount_ml: number) => {
      const { data, error } = await supabase
        .from("water_logs")
        .insert({ user_id: userId, amount_ml })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["water", userId] }),
  });
}

export function useDeleteWater(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("water_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["water", userId] }),
  });
}

// ---------- Weight ----------
export const weightHistoryQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["weight", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WeightLog[]> => {
      if (!userId) return [];
      logQueryExecution("weight", "weightHistoryQueryOptions");
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

export function useAddWeight(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { weight_kg: number; note?: string | null }) => {
      const { data, error } = await supabase
        .from("weight_logs")
        .insert({ user_id: userId, weight_kg: payload.weight_kg, note: payload.note ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight", userId] }),
  });
}

export function useDeleteWeight(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weight", userId] }),
  });
}

// ---------- Aggregations ----------
export function sumMealTotals(meals: MealEntry[]) {
  return sumNutritionSnapshots(meals);
}

export function sumWater(logs: WaterLog[]): number {
  return logs.reduce((a, w) => a + (w.amount_ml ?? 0), 0);
}
