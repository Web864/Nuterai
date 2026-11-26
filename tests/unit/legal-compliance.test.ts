import { describe, expect, it } from "vitest";

import { MIN_AGE } from "@/lib/legal";
import { PLANS } from "@/lib/billing/plans";
import { step2Schema } from "@/features/onboarding/schemas";

describe("minimum age", () => {
  it("is 18", () => {
    expect(MIN_AGE).toBe(18);
  });

  it("onboarding rejects anyone under the minimum age", () => {
    const base = { sex: "female", height_cm: 165, current_weight_kg: 60, target_weight_kg: 58 };
    expect(step2Schema.safeParse({ ...base, age: MIN_AGE - 1 }).success).toBe(false);
    expect(step2Schema.safeParse({ ...base, age: MIN_AGE }).success).toBe(true);
  });
});

describe("data export", () => {
  it("is available on every plan, not only Pro", () => {
    for (const plan of Object.values(PLANS)) {
      expect(plan.entitlements).toContain("data_export");
    }
  });
});
