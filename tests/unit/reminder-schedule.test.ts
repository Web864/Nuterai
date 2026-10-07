import { describe, expect, it } from "vitest";

import {
  DEFAULT_MEAL_TIMES,
  buildDietReminderDrafts,
  buildHydrationReminderDrafts,
  buildWorkoutPlanReminderDrafts,
  deriveRoutineMealTimes,
  deriveRoutineWorkoutTime,
} from "@/lib/reminders";

describe("automatic reminder schedule", () => {
  it.each([
    ["05:00", "22:00", { breakfast: "06:30", lunch: "12:39", snack: "15:12", dinner: "17:45" }],
    ["07:00", "22:00", { breakfast: "08:30", lunch: "13:45", snack: "16:00", dinner: "18:15" }],
    ["09:00", "00:00", { breakfast: "10:30", lunch: "15:45", snack: "18:00", dinner: "20:15" }],
  ])("derives meal defaults for a %s to %s routine", (wakeTime, sleepTime, expected) => {
    expect(deriveRoutineMealTimes({ wakeTime, sleepTime })).toEqual(expected);
  });

  it("uses valid explicit meal times over routine-derived values", () => {
    const schedule = deriveRoutineMealTimes({
      wakeTime: "07:00",
      sleepTime: "22:00",
      explicitMealTimes: { breakfast: "07:15", dinner: "19:30" },
    });

    expect(schedule).toMatchObject({ breakfast: "07:15", dinner: "19:30", lunch: "13:45" });
  });

  it("retains legacy defaults when a complete routine is unavailable", () => {
    expect(deriveRoutineMealTimes({ wakeTime: "07:00" })).toEqual(DEFAULT_MEAL_TIMES);
    expect(deriveRoutineWorkoutTime({ sleepTime: "22:00" })).toBe("19:00");
  });

  it("keeps hydration drafts within the awake window and uniquely keyed", () => {
    const drafts = buildHydrationReminderDrafts({
      timezone: "Asia/Karachi",
      targetMl: 2500,
      wakeTime: "07:00",
      sleepTime: "22:00",
      intervalMinutes: 120,
    });

    expect(drafts.map((draft) => draft.scheduled_time)).toEqual(["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00"]);
    expect(new Set(drafts.map((draft) => draft.source_id)).size).toBe(drafts.length);
    expect(drafts.every((draft) => draft.source === "water_plan" && draft.timezone === "Asia/Karachi")).toBe(true);
  });

  it("uses the routine only as the existing workout defaultTime and preserves explicit plan times", () => {
    const defaultTime = deriveRoutineWorkoutTime({ wakeTime: "07:00", sleepTime: "22:00" });
    const drafts = buildWorkoutPlanReminderDrafts({
      timezone: "Asia/Karachi",
      planId: "plan-1",
      days: [
        { id: "day-1", day_index: 0, title: "Morning strength", scheduled_time: "10:00" },
        { id: "day-2", day_index: 1, title: "Cardio" },
      ],
      defaultTime,
    });

    expect(defaultTime).toBe("18:15");
    expect(drafts.map((draft) => draft.scheduled_time)).toEqual(["10:00", "18:15"]);
    expect(drafts.every((draft) => draft.source === "workout_plan")).toBe(true);
  });

  it("keeps manual and Coach sources out of automatic draft builders", () => {
    const sources = [
      ...buildDietReminderDrafts("UTC", { breakfast: "08:00" }),
      ...buildHydrationReminderDrafts({ timezone: "UTC", targetMl: 2000, wakeTime: "08:00", sleepTime: "22:00" }),
    ].map((draft) => draft.source);

    expect(sources).not.toContain("manual");
    expect(sources).not.toContain("ai_coach");
  });
});