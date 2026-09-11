import { describe, expect, it } from "vitest";
import {
  applyScreenBreakSnooze,
  defaultScreenBreakSettings,
  resetScreenBreakSession,
  screenBreakMessage,
  shouldTriggerScreenBreak,
  validateScreenBreakSettings,
} from "../../src/features/screen-break/screen-break.utils";

describe("screen break utilities", () => {
  it("defaults to disabled safe settings", () => {
    expect(defaultScreenBreakSettings()).toMatchObject({
      enabled: false,
      intervalMinutes: 20,
      breakDurationSeconds: 20,
    });
  });

  it("clamps settings to safe ranges", () => {
    expect(validateScreenBreakSettings({ intervalMinutes: 2, breakDurationSeconds: 999 })).toMatchObject({
      intervalMinutes: 10,
      breakDurationSeconds: 300,
    });
    expect(validateScreenBreakSettings({ intervalMinutes: 240, breakDurationSeconds: 1 })).toMatchObject({
      intervalMinutes: 120,
      breakDurationSeconds: 10,
    });
  });

  it("triggers only when threshold is reached and no reminder or snooze is active", () => {
    expect(shouldTriggerScreenBreak({ accumulatedActiveMs: 20 * 60_000, thresholdMs: 20 * 60_000, lastInteractionAt: null, snoozedUntil: null, reminderActive: false })).toBe(true);
    expect(shouldTriggerScreenBreak({ accumulatedActiveMs: 20 * 60_000, thresholdMs: 20 * 60_000, lastInteractionAt: null, snoozedUntil: null, reminderActive: true })).toBe(false);
    expect(shouldTriggerScreenBreak({ accumulatedActiveMs: 20 * 60_000, thresholdMs: 20 * 60_000, lastInteractionAt: null, snoozedUntil: Date.now() + 60_000, reminderActive: false })).toBe(false);
  });

  it("snoozes and resets session state", () => {
    const state = { accumulatedActiveMs: 99, thresholdMs: 100, lastInteractionAt: 1, snoozedUntil: null, reminderActive: true };
    expect(applyScreenBreakSnooze(state, 5, 1_000).snoozedUntil).toBe(301_000);
    expect(resetScreenBreakSession(state)).toMatchObject({ accumulatedActiveMs: 0, lastInteractionAt: null, reminderActive: false });
  });

  it("rotates positive reminder copy", () => {
    expect(screenBreakMessage(0)).toContain("Screen break");
    expect(screenBreakMessage(3)).toContain("Small break");
  });
});
