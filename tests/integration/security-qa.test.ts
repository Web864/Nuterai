/**
 * Phase 7 QA: a small batch of direct "unauthorized API access" checks
 * against the live project, distinct from the friendships/coach_messages/
 * xp_events coverage already in idor-regression.test.ts. Read-only or
 * self-cleaning; no destructive production actions.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, createTestUser, deleteTestUser, userClient, type TestUser } from "../helpers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const admin = adminClient();
let userA: TestUser;
let userB: TestUser;

beforeAll(async () => {
  userA = await createTestUser(admin, "secqa-a");
  userB = await createTestUser(admin, "secqa-b");
});

afterAll(async () => {
  await deleteTestUser(admin, userA.id);
  await deleteTestUser(admin, userB.id);
});

function anonClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("security QA: unauthorized API access", () => {
  it("an unauthenticated caller gets zero profile rows, not an error leaking existence", async () => {
    const client = anonClient();
    const { data, error } = await client.from("profiles").select("id").limit(5);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a user cannot update another user's profile row (IDOR on profiles)", async () => {
    const clientA = await userClient(userA.email, userA.password);
    const { data, error } = await clientA
      .from("profiles")
      .update({ full_name: "Hijacked" })
      .eq("id", userB.id)
      .select();
    // RLS silently returns zero affected rows rather than an error.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: check } = await admin.from("profiles").select("full_name").eq("id", userB.id).single();
    expect(check?.full_name).not.toBe("Hijacked");
  });

  it("malformed RPC input (wrong endpoint name) is rejected, not silently accepted", async () => {
    const clientA = await userClient(userA.email, userA.password);
    const { error } = await clientA.rpc("check_ai_rate_limit", {
      p_endpoint: "<script>alert(1)</script>",
    });
    expect(error).toBeTruthy();
  });
});
