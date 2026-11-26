/**
 * The pricing page advertises PLANS.*.limits; Postgres enforces the numbers in
 * check_ai_rate_limit(). This test fails if the two drift apart, so the page
 * can never promise a limit the database does not enforce.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PLANS } from "@/lib/billing/plans";

const MIGRATIONS = resolve(__dirname, "../../supabase/migrations");

function latestRateLimitMigration(): string {
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .filter((f) =>
      /CREATE OR REPLACE FUNCTION public\.check_ai_rate_limit/.test(
        readFileSync(resolve(MIGRATIONS, f), "utf8"),
      ),
    );
  return readFileSync(resolve(MIGRATIONS, files[files.length - 1]), "utf8");
}

function dailyLimits(block: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of block.matchAll(
    /WHEN '(\w+)' THEN\s+v_burst_limit := \d+;\s+v_daily_limit := (\d+);/g,
  )) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

describe("plan limits match the database", () => {
  const sql = latestRateLimitMigration();
  const [proBlock, freeBlock] = sql.split(/\n\s+ELSE\n\s+CASE p_endpoint/);

  it("the latest migration is the plan-aware one", () => {
    expect(sql).toMatch(/IF v_plan = 'pro' THEN/);
    expect(sql).toMatch(/s\.status::text IN \('active', 'trialing'\)/);
  });

  for (const [planId, block] of [
    ["pro", proBlock],
    ["free", freeBlock],
  ] as const) {
    it(`${planId} limits in plans.ts equal the SQL caps`, () => {
      const db = dailyLimits(block);
      const l = PLANS[planId].limits;
      expect(db).toEqual({
        coach: l.coachMessagesPerDay,
        meal_text: l.mealTextPerDay,
        meal_vision: l.scansPerDay,
        workout: l.planGenerationsPerDay,
      });
    });
  }

  it("feature copy quotes the enforced numbers", () => {
    const free = PLANS.free.features.join(" ");
    const pro = PLANS.pro.features.join(" ");
    expect(free).toContain(`${PLANS.free.limits.coachMessagesPerDay} messages`);
    expect(free).toContain(`${PLANS.free.limits.scansPerDay} a day`);
    expect(pro).toContain(`${PLANS.pro.limits.coachMessagesPerDay} messages`);
    expect(pro).toContain(`${PLANS.pro.limits.scansPerDay} a day`);
    expect(pro).not.toMatch(/unlimited/i);
  });
});
