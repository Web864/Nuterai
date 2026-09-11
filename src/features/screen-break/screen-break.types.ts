export type ScreenBreakSettings = {
  enabled: boolean;
  intervalMinutes: number;
  breakDurationSeconds: number;
  activeStartTime: string;
  activeEndTime: string;
  respectQuietHours: boolean;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  snoozeEnabled: boolean;
};

export type ScreenBreakMonitoringStatus = "disabled" | "unavailable" | "permission_required" | "ready" | "monitoring" | "failed";

export type ScreenBreakSessionState = {
  accumulatedActiveMs: number;
  thresholdMs: number;
  lastInteractionAt: number | null;
  snoozedUntil: number | null;
  reminderActive: boolean;
};

export type ScreenBreakAction =
  | "update_screen_break_settings"
  | "start_screen_break"
  | "complete_screen_break"
  | "snooze_screen_break"
  | "skip_screen_break";

export type ScreenBreakSettingsPatch = Partial<ScreenBreakSettings>;

export type ScreenBreakNativeBridge = {
  isUsageAccessGranted(): Promise<{ granted: boolean; unavailable?: boolean }>;
  openUsageAccessSettings(): Promise<void>;
  getActiveUsageDuration(): Promise<{ activeUsageMs: number; source: "system" | "nutriai_foreground" | "unavailable" }>;
  resetUsageSession(): Promise<void>;
  startUsageMonitoring(options: { intervalMinutes: number }): Promise<{ started: boolean }>;
  stopUsageMonitoring(): Promise<void>;
};
