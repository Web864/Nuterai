import { ENABLE_SCREEN_BREAK_REMINDERS } from "./screen-break.config";
import type { ScreenBreakMonitoringStatus, ScreenBreakSettings } from "./screen-break.types";
import { getScreenBreakNativeBridge } from "./screen-break.native";

// Phase 2: Screen Break Reminder
// Dormant startup reconciliation. When the feature flag is false this performs
// no permission checks, no monitoring, and no notification scheduling.
export async function reconcileScreenBreakMonitoring(settings: ScreenBreakSettings | null): Promise<ScreenBreakMonitoringStatus> {
  if (!ENABLE_SCREEN_BREAK_REMINDERS || !settings?.enabled) return "disabled";

  const bridge = await getScreenBreakNativeBridge();
  const permission = await bridge.isUsageAccessGranted();
  if (permission.unavailable) return "unavailable";
  if (!permission.granted) return "permission_required";

  const started = await bridge.startUsageMonitoring({ intervalMinutes: settings.intervalMinutes });
  return started.started ? "monitoring" : "failed";
}
