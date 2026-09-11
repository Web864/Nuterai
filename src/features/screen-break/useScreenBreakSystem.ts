import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ENABLE_SCREEN_BREAK_REMINDERS } from "./screen-break.config";
import { screenBreakSettingsQueryOptions } from "./screen-break.service";
import { reconcileScreenBreakMonitoring } from "./screen-break.monitor";

// Phase 2: Screen Break Reminder
// With the feature flag off, this hook does nothing: no UI, permission checks,
// monitoring, notification scheduling, or native calls.
export function useScreenBreakSystem(userId: string | undefined) {
  const settings = useQuery(screenBreakSettingsQueryOptions(userId));

  useEffect(() => {
    if (!ENABLE_SCREEN_BREAK_REMINDERS || !userId) return;
    void reconcileScreenBreakMonitoring(settings.data ?? null).catch((error) => {
      if (import.meta.env.DEV) console.warn("[screen-break] reconciliation failed", error);
    });
  }, [userId, settings.data]);
}
