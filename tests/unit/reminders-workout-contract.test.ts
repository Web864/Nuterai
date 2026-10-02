import { describe, expect, it } from "vitest";

import { sourceLabel, toInsertPayload } from "@/lib/reminders";

describe("reminder payload validation", () => {
  it("rejects malformed reminder times before reaching Supabase", () => {
    expect(() =>
      toInsertPayload({
        title: "Hydration",
        message: "Drink water",
        type: "water",
        scheduled_time: "25:99",
        timezone: "UTC",
        recurrence_rule: { frequency: "daily" },
        source: "manual",
        created_by: "user",
      }),
    ).toThrow(/scheduled_time|HH:MM|time/i);
  });

  it("rejects blank reminder titles before reaching Supabase", () => {
    expect(() =>
      toInsertPayload({
        title: "   ",
        message: "Drink water",
        type: "water",
        scheduled_time: "08:00",
        timezone: "UTC",
        recurrence_rule: { frequency: "daily" },
        source: "manual",
        created_by: "user",
      }),
    ).toThrow(/title/i);
  });

  it("labels workout-plan reminders correctly", () => {
    expect(sourceLabel("workout_plan")).toBe("Workout plan");
  });
});
