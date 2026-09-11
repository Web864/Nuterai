import { Capacitor, registerPlugin } from "@capacitor/core";
import { ENABLE_SCREEN_BREAK_REMINDERS } from "./screen-break.config";
import type { ScreenBreakNativeBridge } from "./screen-break.types";

// Phase 2: Screen Break Reminder
// Feature is intentionally disabled in production. Enable through the
// centralized feature flag after Usage Access UX and Play policy review.
type NativeScreenBreakPlugin = ScreenBreakNativeBridge;

const NativeScreenBreak = registerPlugin<NativeScreenBreakPlugin>("ScreenBreakUsage");

export async function getScreenBreakNativeBridge(): Promise<ScreenBreakNativeBridge> {
  if (!ENABLE_SCREEN_BREAK_REMINDERS || !Capacitor.isNativePlatform()) return unavailableBridge;
  return NativeScreenBreak;
}

const unavailableBridge: ScreenBreakNativeBridge = {
  async isUsageAccessGranted() {
    return { granted: false, unavailable: true };
  },
  async openUsageAccessSettings() {
    throw new Error("Usage Access is unavailable in this build.");
  },
  async getActiveUsageDuration() {
    return { activeUsageMs: 0, source: "unavailable" };
  },
  async resetUsageSession() {},
  async startUsageMonitoring() {
    return { started: false };
  },
  async stopUsageMonitoring() {},
};
