export const ENABLE_SCREEN_BREAK_REMINDERS =
  import.meta.env.VITE_ENABLE_SCREEN_BREAK_REMINDERS === "true" ||
  import.meta.env.ENABLE_SCREEN_BREAK_REMINDERS === "true";

export const SCREEN_BREAK_DEFAULTS = {
  enabled: false,
  intervalMinutes: 20,
  breakDurationSeconds: 20,
  activeStartTime: "08:00",
  activeEndTime: "22:00",
  respectQuietHours: true,
  vibrationEnabled: true,
  soundEnabled: true,
  snoozeEnabled: true,
} as const;

export const SCREEN_BREAK_LIMITS = {
  minIntervalMinutes: 10,
  maxIntervalMinutes: 120,
  minBreakDurationSeconds: 10,
  maxBreakDurationSeconds: 300,
} as const;

export const SCREEN_BREAK_MESSAGES = [
  "Screen break. Time to look away for 20 seconds.",
  "Quick visual reset. Focus on something in the distance for a moment.",
  "20-second break. Give your eyes a short screen pause.",
  "Small break, fresh focus. Look away from the screen for 20 seconds.",
] as const;

export const SCREEN_BREAK_FEATURE_DISABLED_MESSAGE =
  "Screen Break reminders are not enabled in this version yet.";
