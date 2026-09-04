/**
 * Phase 7 QA: authentication edge cases not covered by the existing
 * password-reset / account-deletion / IDOR suites. Runs against the live
 * project with disposable admin-created (pre-confirmed) test users, so none
 * of this depends on the deferred SMTP/email-confirmation issue.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, createTestUser, deleteTestUser, userClient, type TestUser } from "../helpers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const admin = adminClient();
let user: TestUser;

beforeAll(async () => {
  user = await createTestUser(admin, "authedge");
});

afterAll(async () => {
  await deleteTestUser(admin, user.id);
});

function anonClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("auth edge cases", () => {
  it("wrong password is rejected", async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password: "definitely-not-the-right-password-Aa1!",
    });
    expect(error).toBeTruthy();
    expect(data.session).toBeNull();
  });

  it("sign-in with a non-existent email is rejected with a generic error (no enumeration)", async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: `nobody-${Date.now()}@nutriai-test.invalid`,
      password: "whatever-Aa1!",
    });
    expect(error).toBeTruthy();
    expect(data.session).toBeNull();
    // Must not distinguish "wrong password" from "no such account" in the message.
    expect(error?.message).not.toMatch(/no user|not found|does not exist/i);
  });

  it("logout actually clears the session", async () => {
    const client = await userClient(user.email, user.password);
    const before = await client.auth.getSession();
    expect(before.data.session).not.toBeNull();

    const { error } = await client.auth.signOut();
    expect(error).toBeNull();

    const after = await client.auth.getSession();
    expect(after.data.session).toBeNull();
  });

  it("signing up again with an already-registered, confirmed email does not create a duplicate account", async () => {
    const client = anonClient();
    const { data, error } = await client.auth.signUp({
      email: user.email,
      password: "some-other-password-Bb2!",
    });
    // Supabase's documented anti-enumeration behavior for an existing
    // *confirmed* user: either an explicit error, or a "success" response
    // whose returned user has no new identity and issues no session. Either
    // way, no second account must actually be created for this email.
    if (error) {
      expect(error).toBeTruthy();
    } else {
      expect(data.session).toBeNull();
    }
    const { data: list } = await admin.auth.admin.listUsers();
    const matches = list.users.filter((u) => u.email === user.email);
    expect(matches.length).toBe(1);
  });

  it("a deleted account can no longer sign in with its old credentials", async () => {
    const victim = await createTestUser(admin, "authedge-deleted");
    await deleteTestUser(admin, victim.id);

    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: victim.email,
      password: victim.password,
    });
    expect(error).toBeTruthy();
    expect(data.session).toBeNull();
  });
});
