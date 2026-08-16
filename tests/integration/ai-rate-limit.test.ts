/**
 * Tests check_ai_rate_limit() directly against the live project. Requires
 * supabase/migrations/20260816120100_ai_rate_limiting.sql to have been
 * deployed — see the Phase 1/1-C reports for why this sandboxed environment
 * couldn't apply it itself. The suite probes for the function first and
 * skips with a clear message if it isn't there yet, rather than failing.
 *
 * Phase 1-C: the RPC no longer accepts custom limits (the old
 * p_burst_limit/p_burst_window_seconds/p_daily_limit parameters are gone —
 * only p_endpoint remains, restricted to the four real endpoint names, with
 * the actual limits hardcoded inside the function). Tests below seed
 * ai_usage_events rows directly via the service-role client to reach edge
 * conditions quickly against the REAL hardcoded limits (e.g. pre-seed 7
 * "coach" calls to test around its real burst limit of 8) rather than
 * either specifying a fake small limit (no longer possible — that's exactly
 * the bug this patch closes) or making dozens of real round-trips. Each
 * test uses its own freshly created, freshly deleted user, so there is no
 * cross-test interference and no manual row cleanup needed — deleting the
 * user cascades away their ai_usage_events rows.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  userClient,
  isMissingSchemaError,
} from "../helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const admin = adminClient();
let schemaDeployed = false;

beforeAll(async () => {
  // Any response other than "function not found" proves the RPC exists —
  // an unauthenticated/no-session probe call still correctly errors
  // ("Unauthorized", from inside the function) rather than 404ing at the
  // PostgREST routing layer, which is exactly the distinction
  // isMissingSchemaError checks for.
  const probe = await admin.rpc("check_ai_rate_limit", { p_endpoint: "__probe__" });
  schemaDeployed = !isMissingSchemaError(probe.error);
  if (!schemaDeployed) {
    console.warn(
      "[ai-rate-limit.test] check_ai_rate_limit() not found on the live project — " +
        "20260816120100_ai_rate_limiting.sql has not been deployed yet. Skipping this suite.",
    );
  }
});

async function seedUsageRows(
  userId: string,
  endpoint: string,
  count: number,
  createdAt: Date = new Date(),
): Promise<void> {
  if (count <= 0) return;
  const rows = Array.from({ length: count }, () => ({
    user_id: userId,
    endpoint,
    created_at: createdAt.toISOString(),
  }));
  const { error } = await admin.from("ai_usage_events").insert(rows);
  if (error) throw new Error(`seedUsageRows failed: ${error.message}`);
}

describe("check_ai_rate_limit", () => {
  it("enforces the real server-side burst limit for 'coach' (8) without the caller ever supplying it", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const user = await createTestUser(admin, "rl-burst");
    try {
      const client = await userClient(user.email, user.password);
      await seedUsageRows(user.id, "coach", 7);

      const { data: eighth, error: eighthErr } = await client.rpc("check_ai_rate_limit", {
        p_endpoint: "coach",
      });
      expect(eighthErr).toBeNull();
      expect((eighth as { allowed: boolean }).allowed).toBe(true); // 8th of 8 admitted

      const { data: ninth } = await client.rpc("check_ai_rate_limit", { p_endpoint: "coach" });
      expect((ninth as { allowed: boolean; reason?: string }).allowed).toBe(false);
      expect((ninth as { reason?: string }).reason).toBe("burst");
    } finally {
      await deleteTestUser(admin, user.id);
    }
  });

  it("enforces the real daily limit for 'meal_text' (50) independently of the burst window", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const user = await createTestUser(admin, "rl-daily");
    try {
      const client = await userClient(user.email, user.password);
      // 49 rows an hour old: outside the 5-minute burst window, inside the
      // 24-hour daily window.
      await seedUsageRows(user.id, "meal_text", 49, new Date(Date.now() - 60 * 60 * 1000));

      const { data: fiftieth } = await client.rpc("check_ai_rate_limit", {
        p_endpoint: "meal_text",
      });
      expect((fiftieth as { allowed: boolean }).allowed).toBe(true); // 50th of 50 admitted

      const { data: blocked } = await client.rpc("check_ai_rate_limit", {
        p_endpoint: "meal_text",
      });
      expect((blocked as { allowed: boolean; reason?: string }).allowed).toBe(false);
      expect((blocked as { reason?: string }).reason).toBe("daily");
    } finally {
      await deleteTestUser(admin, user.id);
    }
  });

  it("rejects an unrecognized endpoint name", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const user = await createTestUser(admin, "rl-unknown-endpoint");
    try {
      const client = await userClient(user.email, user.password);
      const { error } = await client.rpc("check_ai_rate_limit", {
        p_endpoint: "not-a-real-endpoint",
      });
      expect(error).toBeTruthy();
    } finally {
      await deleteTestUser(admin, user.id);
    }
  });

  it("a client can no longer supply its own limits — the parameters don't exist in the deployed signature", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const user = await createTestUser(admin, "rl-no-custom-limits");
    try {
      const client = await userClient(user.email, user.password);
      // Calling with the old parameter shape must fail to resolve to any
      // function overload — PostgREST reports "no function matches" rather
      // than silently accepting and ignoring the extra arguments. This is
      // the concrete, protocol-level proof that the Phase 1-C vulnerability
      // (a caller granting itself an inflated limit) is no longer possible:
      // there is no signature left that accepts it.
      const { error } = await client.rpc("check_ai_rate_limit", {
        p_endpoint: "coach",
        p_burst_limit: 999999,
        p_burst_window_seconds: 1,
        p_daily_limit: 999999,
      } as never);
      expect(error).toBeTruthy();
      expect(isMissingSchemaError(error)).toBe(true); // "no function matches" shape, not a real DB error
    } finally {
      await deleteTestUser(admin, user.id);
    }
  });

  it("identity is derived only from auth.uid() — quota is per-user, not shared or spoofable via any parameter", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const userA = await createTestUser(admin, "rl-isolation-a");
    const userB = await createTestUser(admin, "rl-isolation-b");
    try {
      const clientA = await userClient(userA.email, userA.password);
      const clientB = await userClient(userB.email, userB.password);

      // Exhaust A's "workout" burst limit (3).
      await seedUsageRows(userA.id, "workout", 3);
      const { data: blockedA } = await clientA.rpc("check_ai_rate_limit", {
        p_endpoint: "workout",
      });
      expect((blockedA as { allowed: boolean }).allowed).toBe(false);

      // B, same endpoint, no seeded rows — must still be allowed.
      const { data: allowedB } = await clientB.rpc("check_ai_rate_limit", {
        p_endpoint: "workout",
      });
      expect((allowedB as { allowed: boolean }).allowed).toBe(true);
    } finally {
      await deleteTestUser(admin, userA.id);
      await deleteTestUser(admin, userB.id);
    }
  });

  it("parallel/concurrent requests are serialized to exactly the real limit, not double-admitted", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const user = await createTestUser(admin, "rl-concurrency");
    try {
      const client = await userClient(user.email, user.password);
      // meal_text's real burst limit is 10; fire 15 concurrent calls.
      const results = await Promise.all(
        Array.from({ length: 15 }, () =>
          client.rpc("check_ai_rate_limit", { p_endpoint: "meal_text" }),
        ),
      );
      const allowedCount = results.filter((r) => (r.data as { allowed: boolean })?.allowed).length;
      // If the advisory lock weren't serializing these, a race could let
      // more than 10 through (each reading a stale pre-insert count).
      expect(allowedCount).toBe(10);
    } finally {
      await deleteTestUser(admin, user.id);
    }
  });

  it("rejects an unauthenticated call", async (ctx) => {
    if (!schemaDeployed) return ctx.skip();
    const { createClient } = await import("@supabase/supabase-js");
    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("check_ai_rate_limit", { p_endpoint: "coach" });
    expect(error).toBeTruthy();
  });
});
