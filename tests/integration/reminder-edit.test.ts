import { afterEach, describe, expect, it } from "vitest";
import { adminClient, createTestUser, deleteTestUser, userClient, type TestUser } from "../helpers";

const admin = adminClient();
let user: TestUser | undefined;

afterEach(async () => {
  if (user) {
    await deleteTestUser(admin, user.id);
    user = undefined;
  }
});

describe("reminder editing", () => {
  it("persists an authenticated user's edited reminder time without creating a duplicate", async () => {
    user = await createTestUser(admin, "reminder-edit");
    const client = await userClient(user.email, user.password);

    const { data: created, error: createError } = await client
      .from("reminders")
      .insert({
        user_id: user.id,
        type: "water",
        title: "Drink water",
        message: "Drink water",
        times: ["08:00"],
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        timezone: "UTC",
        is_active: true,
        is_recurring: true,
        scheduled_time: "08:00",
        recurrence_rule: { frequency: "daily" },
        enabled: true,
        source: "manual",
        created_by: "user",
      } as never)
      .select("id,title,scheduled_time,times")
      .single();
    expect(createError).toBeNull();
    expect(created).toBeTruthy();

    const { data: updated, error: updateError } = await client
      .from("reminders")
      .update({ title: "Morning water", scheduled_time: "09:00", times: ["09:00"] } as never)
      .eq("id", created!.id)
      .eq("user_id", user.id)
      .select("id,title,scheduled_time,times")
      .single();
    expect(updateError).toBeNull();
    expect(updated).toMatchObject({
      id: created!.id,
      title: "Morning water",
      scheduled_time: "09:00",
      times: ["09:00"],
    });

    const { count, error: countError } = await client
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(countError).toBeNull();
    expect(count).toBe(1);
  });
});
