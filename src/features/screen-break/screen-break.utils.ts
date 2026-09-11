import { SCREEN_BREAK_DEFAULTS, SCREEN_BREAK_LIMITS, SCREEN_BREAK_MESSAGES } from "./screen-break.config";
import type { ScreenBreakSessionState, ScreenBreakSettings, ScreenBreakSettingsPatch } from "./screen-break.types";

const HHMM = /^(\d{1,2}):(\d{2})$/;

export function validateScreenBreakSettings(patch: ScreenBreakSettingsPatch): ScreenBreakSettingsPatch {
  const next: ScreenBreakSettingsPatch = {};
  if (patch.enabled !== undefined) next.enabled = Boolean(patch.enabled);
  if (patch.intervalMinutes !== undefined) {
    next.intervalMinutes = clampInteger(
      patch.intervalMinutes,
      SCREEN_BREAK_LIMITS.minIntervalMinutes,
      SCREEN_BREAK_LIMITS.maxIntervalMinutes,
    );
  }
  if (patch.breakDurationSeconds !== undefined) {
    next.breakDurationSeconds = clampInteger(
      patch.breakDurationSeconds,
      SCREEN_BREAK_LIMITS.minBreakDurationSeconds,
      SCREEN_BREAK_LIMITS.maxBreakDurationSeconds,
    );
  }
  if (patch.activeStartTime !== undefined) next.activeStartTime = normalizeTime(patch.activeStartTime, SCREEN_BREAK_DEFAULTS.activeStartTime);
  if (patch.activeEndTime !== undefined) next.activeEndTime = normalizeTime(patch.activeEndTime, SCREEN_BREAK_DEFAULTS.activeEndTime);
  if (patch.respectQuietHours !== undefined) next.respectQuietHours = Boolean(patch.respectQuietHours);
  if (patch.vibrationEnabled !== undefined) next.vibrationEnabled = Boolean(patch.vibrationEnabled);
  if (patch.soundEnabled !== undefined) next.soundEnabled = Boolean(patch.soundEnabled);
  if (patch.snoozeEnabled !== undefined) next.snoozeEnabled = Boolean(patch.snoozeEnabled);
  return next;
}

export function defaultScreenBreakSettings(): ScreenBreakSettings {
  return { ...SCREEN_BREAK_DEFAULTS };
}

export function shouldTriggerScreenBreak(state: ScreenBreakSessionState, now = Date.now()): boolean {
  if (state.reminderActive) return false;
  if (state.snoozedUntil && state.snoozedUntil > now) return false;
  return state.accumulatedActiveMs >= state.thresholdMs;
}

export function applyScreenBreakSnooze(state: ScreenBreakSessionState, minutes: number, now = Date.now()): ScreenBreakSessionState {
  return {
    ...state,
    reminderActive: false,
    snoozedUntil: now + Math.max(1, minutes) * 60_000,
  };
}

export function resetScreenBreakSession(state: ScreenBreakSessionState): ScreenBreakSessionState {
  return {
    ...state,
    accumulatedActiveMs: 0,
    lastInteractionAt: null,
    snoozedUntil: null,
    reminderActive: false,
  };
}

export function screenBreakMessage(seed = 0): string {
  return SCREEN_BREAK_MESSAGES[Math.abs(seed) % SCREEN_BREAK_MESSAGES.length];
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeTime(value: string, fallback: string): string {
  const match = HHMM.exec(value.trim());
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
