import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} — set it in .env before running tests.`);
  return v;
}

export function adminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** A fresh client signed in as a specific test user — never reuse one client across users. */
export async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

export type TestUser = { id: string; email: string; password: string };

/** Creates a disposable, pre-confirmed test user. Caller is responsible for deleteTestUser cleanup. */
export async function createTestUser(admin: SupabaseClient, label: string): Promise<TestUser> {
  const email = `phase1-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@nutriai-test.invalid`;
  const password = `Test-${Math.random().toString(36).slice(2)}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createTestUser(${label}) failed: ${error?.message ?? "no user returned"}`);
  }
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(admin: SupabaseClient, id: string): Promise<void> {
  await admin.auth.admin.deleteUser(id).catch(() => {
    /* best-effort cleanup */
  });
}

/** True if an error looks like "relation/function does not exist" — i.e. a
 *  migration this test depends on hasn't been deployed to the target project yet.
 *  Covers both raw Postgres error codes (when hit via a DB connection) and
 *  PostgREST's own codes for a table/function missing from its schema cache
 *  (when hit via the REST/RPC API, which is what supabase-js always uses). */
export function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // 42P01 = undefined_table, 42883 = undefined_function (raw Postgres)
  // PGRST202 = RPC function not found, PGRST205 = table not found in schema cache
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(error.code ?? "")) return true;
  return /does not exist|could not find the (function|table)/i.test(error.message ?? "");
}
