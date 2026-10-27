import { describe, expect, it } from "vitest";
import { buildNativeNotifications } from "@/features/reminders/useReminderEngine";

describe("native reminder notifications", () => {
  it("keeps reminders scheduled when Android exact-alarm access is unavailable", () => {
    const target = new Date(Date.now() + 5 * 60_000);
    const reminder = {
      id: "reminder-1",
      title: "Water",
      type: "water",
      message: "Drink water",
      enabled: true,
      is_active: true,
      is_recurring: true,
      recurrence_rule: { frequency: "daily" },
      scheduled_time: `${String(target.getUTCHours()).padStart(2, "0")}:${String(target.getUTCMinutes()).padStart(2, "0")}`,
      times: [],
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      timezone: "UTC",
      snoozed_until: null,
      snooze_until: null,
      last_triggered_at: null,
      one_time_at: null,
      next_trigger_at: null,
    } as never;

    const scheduled = buildNativeNotifications([reminder], null, false);

    expect(scheduled.length).toBeGreaterThan(0);
    expect(scheduled[0]).toMatchObject({
      title: "Water",
      isExactNotification: false,
      isExactMandatory: false,
    });
  });
});
