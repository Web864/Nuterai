/**
 * Unit-level proof (no live DB needed) that the client-side wrapper cannot
 * send custom limits to the RPC at all — Phase 1-C removed the parameters
 * from both the TS call site and the SQL function signature. This is the
 * "impossible by construction" half of the fix; tests/integration/
 * ai-rate-limit.test.ts's "no-custom-limits" test proves the same thing at
 * the live protocol level once the migration is deployed.
 */
import { describe, expect, it, vi } from "vitest";
import { enforceAiRateLimit } from "@/lib/rate-limit.server";
import type { SupabaseClient } from "@supabase/supabase-js";

function fakeSupabase(response: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(response) } as unknown as SupabaseClient;
}

describe("enforceAiRateLimit", () => {
  it("sends only p_endpoint to the RPC — no limit values, no user id", async () => {
    const supabase = fakeSupabase({ data: { allowed: true }, error: null });
    await enforceAiRateLimit(supabase, "coach");

    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    const [fnName, params] = (supabase.rpc as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fnName).toBe("check_ai_rate_limit");
    expect(params).toEqual({ p_endpoint: "coach" });
    // Explicitly confirm the old vulnerable keys are gone, not just absent
    // from the happy-path object shape.
    expect(params).not.toHaveProperty("p_burst_limit");
    expect(params).not.toHaveProperty("p_burst_window_seconds");
    expect(params).not.toHaveProperty("p_daily_limit");
    expect(params).not.toHaveProperty("user_id");
  });

  it("throws a rate-limit error when the server reports burst exhaustion", async () => {
    const supabase = fakeSupabase({ data: { allowed: false, reason: "burst" }, error: null });
    await expect(enforceAiRateLimit(supabase, "workout")).rejects.toThrow(/too quickly/i);
  });

  it("throws a rate-limit error when the server reports the daily cap", async () => {
    const supabase = fakeSupabase({ data: { allowed: false, reason: "daily" }, error: null });
    await expect(enforceAiRateLimit(supabase, "meal_text")).rejects.toThrow(/today's usage limit/i);
  });

  it("fails closed (throws) if the RPC call itself errors", async () => {
    const supabase = fakeSupabase({ data: null, error: { message: "boom" } });
    await expect(enforceAiRateLimit(supabase, "meal_vision")).rejects.toThrow(/try again/i);
  });
});
