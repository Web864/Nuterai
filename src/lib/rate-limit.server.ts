/**
 * Server-side AI rate limiting. Backed by the check_ai_rate_limit() Postgres
 * function (supabase/migrations/20260816120100_ai_rate_limiting.sql), which
 * takes a per-(user,endpoint) advisory lock so concurrent requests can't race
 * past the count check. Called with the caller's own RLS-scoped client (not
 * the service role) — the function reads auth.uid() itself, so there is no
 * user id parameter a client could tamper with.
 *
 * The actual burst/window/daily limits are NOT passed from here — they live
 * entirely inside the Postgres function (Phase 1-C fix). An earlier version
 * of this file built the limit values and sent them as RPC arguments, which
 * meant any authenticated caller invoking the RPC directly (bypassing this
 * wrapper entirely) could supply arbitrarily large limits for themselves.
 * The database is now the sole source of truth for what the limits are; see
 * the migration for the actual numbers per endpoint.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type AiEndpoint = "coach" | "meal_text" | "meal_vision" | "workout";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Throws a user-facing RateLimitError if the caller has exceeded their burst
 * or daily quota for this endpoint; otherwise the attempt has been recorded
 * server-side and the caller may proceed. Fails CLOSED if the check itself
 * errors (e.g. transient DB issue, or the migration hasn't been deployed
 * yet) — a blocked request is preferable to an unbounded-cost failure mode
 * for a cost-sensitive endpoint.
 */
export async function enforceAiRateLimit(
  supabase: SupabaseClient<Database>,
  endpoint: AiEndpoint,
): Promise<void> {
  const { data, error } = await supabase.rpc("check_ai_rate_limit", {
    p_endpoint: endpoint,
  });

  if (error) {
    console.error("[enforceAiRateLimit] check failed", endpoint, error.message);
    throw new RateLimitError("Couldn't verify usage limits right now. Please try again shortly.");
  }

  const result = data as { allowed: boolean; reason?: "burst" | "daily" };
  if (!result.allowed) {
    throw new RateLimitError(
      result.reason === "burst"
        ? "You're sending requests too quickly. Please wait a few minutes and try again."
        : "You've reached today's usage limit for this feature. Please try again tomorrow.",
    );
  }
}
