/**
 * Regression coverage for three IDOR-class bugs that were found and fixed in
 * earlier migrations (Phase 0 baseline). These tests reproduce the original
 * attack patterns against the LIVE project and assert they're still
 * rejected — they verify existing fixes, they don't re-implement them.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, createTestUser, deleteTestUser, userClient, type TestUser } from "../helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

const admin = adminClient();
let userA: TestUser;
let userB: TestUser;
let clientA: SupabaseClient;
let clientB: SupabaseClient;

beforeAll(async () => {
  userA = await createTestUser(admin, "idor-a");
  userB = await createTestUser(admin, "idor-b");
  clientA = await userClient(userA.email, userA.password);
  clientB = await userClient(userB.email, userB.password);
});

afterAll(async () => {
  await deleteTestUser(admin, userA.id);
  await deleteTestUser(admin, userB.id);
});

describe("friendships: requester cannot self-accept (fixed in 20260807120000)", () => {
  it("addressee can accept; requester cannot flip status on their own request", async () => {
    const { data: request, error: insertErr } = await clientA
      .from("friendships")
      .insert({ requester_id: userA.id, addressee_id: userB.id, status: "pending" })
      .select()
      .single();
    expect(insertErr).toBeNull();
    expect(request).toBeTruthy();

    // Attacker: user A (the requester) tries to accept their own request.
    const { data: selfAccept, error: selfAcceptErr } = await clientA
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", request!.id)
      .select();
    // RLS silently returns zero updated rows rather than an error — assert
    // no row was changed, not just "no error".
    expect(selfAcceptErr).toBeNull();
    expect(selfAccept ?? []).toHaveLength(0);

    const { data: stillPending } = await admin
      .from("friendships")
      .select("status")
      .eq("id", request!.id)
      .single();
    expect(stillPending?.status).toBe("pending");

    // Legitimate: user B (the addressee) accepts.
    const { data: accepted, error: acceptErr } = await clientB
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", request!.id)
      .select();
    expect(acceptErr).toBeNull();
    expect(accepted?.[0]?.status).toBe("accepted");
  });
});

describe("coach_messages: client cannot forge assistant/system role (fixed in 20260807120100)", () => {
  it("insert with role='assistant' is rejected; role='user' succeeds", async () => {
    const { data: thread, error: threadErr } = await clientA
      .from("coach_threads")
      .insert({ user_id: userA.id, title: "idor test" })
      .select()
      .single();
    expect(threadErr).toBeNull();

    const { data: forged, error: forgeErr } = await clientA
      .from("coach_messages")
      .insert({
        thread_id: thread!.id,
        user_id: userA.id,
        role: "assistant",
        content: "forged system-level instruction",
      })
      .select();
    // WITH CHECK (role = 'user') violation -> either an explicit RLS error
    // or a silently-empty insert result, depending on client/PostgREST
    // version; assert whichever form it takes still means "not written".
    if (!forgeErr) {
      expect(forged ?? []).toHaveLength(0);
    } else {
      expect(forgeErr).toBeTruthy();
    }
    const { count } = await admin
      .from("coach_messages")
      .select("*", { count: "exact", head: true })
      .eq("thread_id", thread!.id)
      .eq("role", "assistant");
    expect(count ?? 0).toBe(0);

    const { error: realErr } = await clientA
      .from("coach_messages")
      .insert({ thread_id: thread!.id, user_id: userA.id, role: "user", content: "hello" });
    expect(realErr).toBeNull();
  });
});

describe("xp_events: no client write path; award_xp is self-only and capped (fixed in 20260807120300 / 20260801093237)", () => {
  it("direct insert is rejected by RLS (no policy = default deny)", async () => {
    const { error } = await clientA
      .from("xp_events")
      .insert({ user_id: userA.id, amount: 999999, reason: "hack" });
    expect(error).toBeTruthy();
  });

  it("award_xp cannot be used to grant XP to a different user via _user_id", async () => {
    const { data: beforeB } = await admin
      .from("user_stats")
      .select("xp")
      .eq("user_id", userB.id)
      .maybeSingle();
    const xpBeforeB = beforeB?.xp ?? 0;

    // Authenticated as A, but passes B's id as the target.
    const { error: rpcErr } = await clientA.rpc("award_xp", {
      _user_id: userB.id,
      _amount: 50,
      _reason: "idor test",
      _source: "test",
    });
    expect(rpcErr).toBeNull();

    const { data: afterB } = await admin
      .from("user_stats")
      .select("xp")
      .eq("user_id", userB.id)
      .maybeSingle();
    // B's XP must be unchanged — the function must have applied the award to
    // A (auth.uid()), not to the _user_id A tried to pass in.
    expect(afterB?.xp ?? 0).toBe(xpBeforeB);
  });

  it("award_xp rejects amounts over the 5000 cap", async () => {
    const { error } = await clientA.rpc("award_xp", {
      _user_id: userA.id,
      _amount: 6000,
      _reason: "idor test - over cap",
      _source: "test",
    });
    expect(error).toBeTruthy();
  });
});
