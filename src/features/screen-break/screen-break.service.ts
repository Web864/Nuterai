import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ENABLE_SCREEN_BREAK_REMINDERS } from "./screen-break.config";
import type { ScreenBreakSettings, ScreenBreakSettingsPatch } from "./screen-break.types";
import { defaultScreenBreakSettings, validateScreenBreakSettings } from "./screen-break.utils";

export const screenBreakSettingsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["screen-break-settings", userId],
    enabled: ENABLE_SCREEN_BREAK_REMINDERS && !!userId,
    queryFn: async (): Promise<ScreenBreakSettings> => {
      if (!ENABLE_SCREEN_BREAK_REMINDERS || !userId) return defaultScreenBreakSettings();
      const { data, error } = await supabase
        .from("screen_break_settings" as never)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaultScreenBreakSettings();
      const row = data as unknown as {
        enabled: boolean;
        interval_minutes: number;
        break_duration_seconds: number;
        active_start_time: string;
        active_end_time: string;
        respect_quiet_hours: boolean;
        vibration_enabled: boolean;
        sound_enabled: boolean;
        snooze_enabled: boolean;
      };
      return {
        enabled: row.enabled,
        intervalMinutes: row.interval_minutes,
        breakDurationSeconds: row.break_duration_seconds,
        activeStartTime: row.active_start_time,
        activeEndTime: row.active_end_time,
        respectQuietHours: row.respect_quiet_hours,
        vibrationEnabled: row.vibration_enabled,
        soundEnabled: row.sound_enabled,
        snoozeEnabled: row.snooze_enabled,
      };
    },
  });

export function useUpdateScreenBreakSettings(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ScreenBreakSettingsPatch) => {
      if (!ENABLE_SCREEN_BREAK_REMINDERS) {
        throw new Error("Screen Break reminders are not enabled in this version yet.");
      }
      const safe = validateScreenBreakSettings(patch);
      const row = {
        user_id: userId,
        enabled: safe.enabled,
        interval_minutes: safe.intervalMinutes,
        break_duration_seconds: safe.breakDurationSeconds,
        active_start_time: safe.activeStartTime,
        active_end_time: safe.activeEndTime,
        respect_quiet_hours: safe.respectQuietHours,
        vibration_enabled: safe.vibrationEnabled,
        sound_enabled: safe.soundEnabled,
        snooze_enabled: safe.snoozeEnabled,
      };
      const { error } = await supabase
        .from("screen_break_settings" as never)
        .upsert(row as never, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["screen-break-settings", userId] }),
  });
}
