/**
 * Server-only admin helpers. Never imported by client code (the `.server.ts`
 * suffix is blocked from browser bundles).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AuthedClient = SupabaseClient<Database>;

/**
 * Verifies the caller holds the `admin` role using the caller's own
 * (RLS-scoped) client. Throws a 403 Response otherwise.
 */
export async function assertAdmin(supabase: AuthedClient, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(`Role check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: admin role required.");
}

/** Service-role client, loaded lazily so it never enters a client bundle. */
export async function getAdminClient(): Promise<AuthedClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as AuthedClient;
}

/** Appends an entry to the admin audit trail. Never throws. */
export async function writeAudit(
  admin: AuthedClient,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await admin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details as never,
  });
  if (error) console.error("audit log write failed", error.message);
}

/** Counts rows in a table, optionally since a timestamp on `created_at`. */
export async function countRows(
  admin: AuthedClient,
  table: string,
  since?: string,
): Promise<number> {
  let q = admin.from(table as never).select("*", { count: "exact", head: true });
  if (since) q = q.gte("created_at", since);
  const { count, error } = await q;
  if (error) {
    console.error(`count ${table} failed`, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Buckets ISO timestamps into a dense day-by-day series of `days` length. */
export function dailySeries(rows: { created_at: string }[], days: number) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([day, count]) => ({ day, count }));
}

export function sinceDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** Clamps a user-supplied page size. */
export function clampLimit(n: number | undefined, def = 25, max = 100): number {
  if (!n || Number.isNaN(n)) return def;
  return Math.min(Math.max(Math.floor(n), 1), max);
}
