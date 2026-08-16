/**
 * Static content checks on the two patched migration files. These prove the
 * SQL text actually contains the Phase 1-C fixes; they do NOT execute
 * anything against a database and cannot prove the migration behaves
 * correctly once applied — that requires a live Postgres instance, which
 * this environment does not have credentials for (see the Phase 1-C
 * report). This is migration-file verification only.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FK_MIGRATION = readFileSync(
  resolve(__dirname, "../../supabase/migrations/20260816120000_account_deletion_fk_fix.sql"),
  "utf8",
);
const RATE_LIMIT_MIGRATION = readFileSync(
  resolve(__dirname, "../../supabase/migrations/20260816120100_ai_rate_limiting.sql"),
  "utf8",
);

describe("20260816120000_account_deletion_fk_fix.sql (static)", () => {
  it("checks the actual ON DELETE behavior (confdeltype), not just FK existence", () => {
    // The Phase 1-C bug: the original version only checked contype = 'f',
    // which is satisfied by ANY foreign key regardless of its delete
    // action. confdeltype is what actually distinguishes CASCADE from
    // NO ACTION/RESTRICT/SET NULL/SET DEFAULT.
    expect(FK_MIGRATION).toMatch(/confdeltype/);
    expect(FK_MIGRATION).toMatch(/v_confdeltype\s*<>\s*'c'/);
  });

  it("handles all three cases: no FK, non-cascade FK, and already-cascade FK", () => {
    expect(FK_MIGRATION).toMatch(/IF v_conname IS NULL THEN/);
    expect(FK_MIGRATION).toMatch(/ELSIF v_confdeltype <> 'c' THEN/);
    // No explicit ELSE branch is required for the "already cascade" case —
    // it's correctly a no-op — but the DROP+re-ADD path must exist and
    // must reference the constraint by its actual discovered name, not a
    // hardcoded guess, so it never touches the wrong constraint.
    expect(FK_MIGRATION).toMatch(/DROP CONSTRAINT %I/);
    expect(FK_MIGRATION).toContain(
      "format('ALTER TABLE public.workout_plans DROP CONSTRAINT %I', v_conname)",
    );
  });

  it("targets workout_plans and workout_sessions with ON DELETE CASCADE", () => {
    for (const table of ["workout_plans", "workout_sessions"]) {
      const re = new RegExp(
        `ALTER TABLE public\\.${table}\\s+ADD CONSTRAINT ${table}_user_id_fkey\\s+FOREIGN KEY \\(user_id\\) REFERENCES auth\\.users\\(id\\) ON DELETE CASCADE`,
      );
      expect(FK_MIGRATION).toMatch(re);
    }
  });

  it("still guards reminders/notifications with a table-existence check (schema drift)", () => {
    expect(FK_MIGRATION).toMatch(/to_regclass\('public\.reminders'\) IS NULL/);
    expect(FK_MIGRATION).toMatch(/to_regclass\('public\.notifications'\) IS NULL/);
  });

  it("scopes every constraint lookup to the user_id column specifically, not any FK on the table", () => {
    const matches = FK_MIGRATION.match(/a\.attname = 'user_id'/g) ?? [];
    // One join condition per table block (4 tables).
    expect(matches.length).toBe(4);
    expect(FK_MIGRATION).toMatch(/array_length\(c\.conkey, 1\) = 1/);
  });
});

describe("20260816120100_ai_rate_limiting.sql (static)", () => {
  it("the function signature accepts only p_endpoint — no client-suppliable limits", () => {
    expect(RATE_LIMIT_MIGRATION).toMatch(
      /CREATE OR REPLACE FUNCTION public\.check_ai_rate_limit\(p_endpoint TEXT\)/,
    );
    expect(RATE_LIMIT_MIGRATION).not.toMatch(/p_burst_limit\s+INT/);
    expect(RATE_LIMIT_MIGRATION).not.toMatch(/p_burst_window_seconds\s+INT/);
    expect(RATE_LIMIT_MIGRATION).not.toMatch(/p_daily_limit\s+INT/);
  });

  it("the REVOKE/GRANT lines target the new single-argument signature", () => {
    expect(RATE_LIMIT_MIGRATION).toContain(
      "REVOKE ALL ON FUNCTION public.check_ai_rate_limit(TEXT) FROM PUBLIC;",
    );
    expect(RATE_LIMIT_MIGRATION).toContain(
      "GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(TEXT) TO authenticated;",
    );
  });

  it("limits are hardcoded per known endpoint and unknown endpoints are rejected", () => {
    for (const endpoint of ["coach", "meal_text", "meal_vision", "workout"]) {
      expect(RATE_LIMIT_MIGRATION).toMatch(new RegExp(`WHEN '${endpoint}' THEN`));
    }
    expect(RATE_LIMIT_MIGRATION).toMatch(/ELSE\s+RAISE EXCEPTION 'Unknown rate-limit endpoint/);
  });

  it("still derives identity exclusively from auth.uid() — no user-id parameter exists", () => {
    expect(RATE_LIMIT_MIGRATION).toMatch(/v_user_id UUID := auth\.uid\(\);/);
    expect(RATE_LIMIT_MIGRATION).not.toMatch(/p_user_id/);
  });

  it("still has the hardened SECURITY DEFINER properties", () => {
    expect(RATE_LIMIT_MIGRATION).toMatch(/SECURITY DEFINER/);
    expect(RATE_LIMIT_MIGRATION).toMatch(/SET search_path = public/);
    expect(RATE_LIMIT_MIGRATION).toMatch(/pg_advisory_xact_lock/);
  });

  it("the comment about recording attempts now matches the actual admit-only behavior", () => {
    expect(RATE_LIMIT_MIGRATION).toMatch(/Only an admitted \(allowed=true\) request is recorded/);
    // The old, inaccurate wording implied every check attempt (including
    // rejections) got recorded — that claim must be gone.
    expect(RATE_LIMIT_MIGRATION).not.toMatch(/Recording the attempt \(not just successes\)/);
  });
});
