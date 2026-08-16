/**
 * Tests the deletion logic in src/lib/account-deletion.server.ts directly
 * against the live project. This deliberately does NOT go through the
 * deleteMyAccount createServerFn/requireSupabaseAuth wrapper — that
 * middleware calls getRequest() from the TanStack Start server runtime,
 * which isn't present in a plain vitest/Node process outside the running
 * app server. The authorization boundary that wrapper provides (only
 * context.userId — taken from the verified JWT, never client input — is
 * ever passed to deleteAccount()) is a structural property visible by
 * reading src/lib/account.functions.ts: its input schema has no user-id
 * field at all, so there is no parameter through which a caller could name
 * a different account. That's verified by code review here, not by an
 * executed HTTP test, and is reported as such rather than overclaimed.
 */
import { afterAll, describe, expect, it } from "vitest";
import { adminClient, createTestUser, userClient } from "../helpers";
import { deleteAccount } from "@/lib/account-deletion.server";

const admin = adminClient();
const cleanupIds: string[] = [];

afterAll(async () => {
  for (const id of cleanupIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
});

describe("deleteAccount", () => {
  it("removes the user and every owned row, including tables with no verified cascade", async () => {
    const user = await createTestUser(admin, "delete-positive");
    cleanupIds.push(user.id);

    // Seed data in tables covered by an existing verified CASCADE...
    await admin.from("meal_entries").insert({
      user_id: user.id,
      name: "test meal",
      calories_kcal: 100,
      protein_g: 1,
      carbs_g: 1,
      fat_g: 1,
      fiber_g: 0,
      meal_type: "snack",
      source: "manual",
      logged_date: new Date().toISOString().slice(0, 10),
    });
    // ...and in the two tables that had NO FK to auth.users before this
    // phase (workout_plans/workout_sessions) — these prove the defensive
    // explicit cleanup works even if the FK-fix migration hasn't been
    // deployed to this project yet.
    const { data: plan } = await admin
      .from("workout_plans")
      .insert({ user_id: user.id, name: "test plan", source: "manual" })
      .select()
      .single();
    await admin.from("workout_sessions").insert({ user_id: user.id, name: "test session" });

    const result = await deleteAccount(user.id);
    expect(result.success).toBe(true);

    const { data: authUser } = await admin.auth.admin.getUserById(user.id);
    expect(authUser?.user ?? null).toBeNull();

    const { count: mealsLeft } = await admin
      .from("meal_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(mealsLeft ?? 0).toBe(0);

    const { count: plansLeft } = await admin
      .from("workout_plans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(plansLeft ?? 0).toBe(0);

    const { count: sessionsLeft } = await admin
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    expect(sessionsLeft ?? 0).toBe(0);

    if (plan) {
      const { count: daysLeft } = await admin
        .from("workout_plan_days")
        .select("*", { count: "exact", head: true })
        .eq("plan_id", plan.id);
      expect(daysLeft ?? 0).toBe(0);
    }

    // Audit trail survives the user's own removal (audit_logs.actor_id is
    // ON DELETE SET NULL, target_id is a plain uuid column, not an FK).
    const { data: audit } = await admin
      .from("audit_logs")
      .select("action, target_id")
      .eq("target_id", user.id)
      .eq("action", "account.self_delete_requested");
    expect(audit?.length ?? 0).toBeGreaterThan(0);

    cleanupIds.length = 0; // already gone, nothing left to clean up
  });

  it("does not report success when auth.users deletion fails, and never leaks a raw exception", async () => {
    // A random, never-issued UUID: auth.admin.deleteUser on a nonexistent
    // user returns an error, exercising the failure path without needing to
    // simulate a real infra fault. Note: audit_logs.actor_id has
    // REFERENCES auth.users(id) — a pre-existing constraint this phase did
    // not change — so writeAudit() cannot persist a row attributed to a
    // user id that never existed in the first place; it's designed to
    // never throw for that (see admin.server.ts), and deleteAccount()
    // still correctly falls through to a safe failure result below. In the
    // real call path this never occurs: deleteAccount() only ever receives
    // an id already backed by a genuine session/JWT.
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const result = await deleteAccount(fakeId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).not.toMatch(/[A-Za-z]+Error:/); // no raw stack/exception leakage
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe("auth boundary primitives deleteMyAccount relies on", () => {
  it("getClaims rejects a garbage bearer token (requireSupabaseAuth's underlying check)", async () => {
    const anon = adminClient(); // service-role client works fine for a getClaims call on an arbitrary string
    const { data, error } = await anon.auth.getClaims("not-a-real-token");
    expect(data?.claims ?? null).toBeNull();
    expect(error).toBeTruthy();
  });

  it("a signed-in user's own JWT resolves claims matching their own id", async () => {
    const user = await createTestUser(admin, "claims-check");
    try {
      const client = await userClient(user.email, user.password);
      const { data: sessionData } = await client.auth.getSession();
      const token = sessionData.session?.access_token;
      expect(token).toBeTruthy();
      const { data, error } = await client.auth.getClaims(token!);
      expect(error).toBeNull();
      expect(data?.claims.sub).toBe(user.id);
    } finally {
      await admin.auth.admin.deleteUser(user.id).catch(() => {});
    }
  });
});
