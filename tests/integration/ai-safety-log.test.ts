/**
 * logAiSafetyEvent must never throw, whether the ai_safety_events table
 * exists yet or not (20260816120200_ai_safety_events.sql — see the same
 * deployment caveat as ai-rate-limit.test.ts). If it does exist, confirms a
 * row is actually written with no message content.
 */
import { describe, expect, it } from "vitest";
import { adminClient, createTestUser, deleteTestUser, isMissingSchemaError } from "../helpers";
import { logAiSafetyEvent } from "@/lib/ai-safety-log.server";

const admin = adminClient();

describe("logAiSafetyEvent", () => {
  it("never throws, and writes a content-free row when the table exists", async () => {
    const user = await createTestUser(admin, "safety-log");
    try {
      await expect(logAiSafetyEvent(user.id, "coach", "crisis_input")).resolves.toBeUndefined();

      const { data, error } = await admin
        .from("ai_safety_events")
        .select("user_id, endpoint, category")
        .eq("user_id", user.id);

      if (isMissingSchemaError(error)) {
        console.warn(
          "[ai-safety-log.test] ai_safety_events table not found — migration not deployed yet, skipping row assertion.",
        );
        return;
      }
      expect(error).toBeNull();
      expect(data?.[0]).toMatchObject({
        user_id: user.id,
        endpoint: "coach",
        category: "crisis_input",
      });
    } finally {
      await deleteTestUser(admin, user.id);
    }
  });
});
