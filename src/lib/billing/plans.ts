/**
 * Client-safe billing catalogue + entitlement matrix.
 *
 * This module is the single source of truth for what each plan unlocks. It is
 * provider-agnostic on purpose: swapping the mock provider for Stripe (see
 * `docs/BILLING.md`) must not require touching this file beyond adding price
 * IDs to `PLANS[...].providerPriceIds`.
 */

export type PlanId = "free" | "pro";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

/** Every gate-able capability in the product. */
export type Entitlement =
  | "ai_coach_unlimited"
  | "photo_scanner"
  | "barcode_scanner"
  | "plan_regeneration_unlimited"
  | "data_export";

export interface PlanLimits {
  // These mirror the caps enforced by public.check_ai_rate_limit()
  // (supabase/migrations/20261126130000_plan_aware_ai_limits.sql). The
  // database is the enforcer; tests/unit/plan-limits-sync.test.ts fails if
  // the two drift apart. Every value is a number: AI calls cost money, so no
  // plan is literally unlimited.
  /** AI Coach messages per rolling 24 hours. */
  coachMessagesPerDay: number;
  /** AI workout plan generations per rolling 24 hours. */
  planGenerationsPerDay: number;
  /** AI photo food scans per rolling 24 hours. Barcode lookups are not AI calls and are not capped. */
  scansPerDay: number;
  /** AI text meal analyses ("2 rotis and daal") per rolling 24 hours. */
  mealTextPerDay: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsdMonthly: number;
  /** Annual price in USD. 0 for Free. */
  priceUsdAnnual: number;
  /** Free-trial days on the annual plan. 0 = no trial. */
  annualTrialDays: number;
  tagline: string;
  features: string[];
  entitlements: Entitlement[];
  limits: PlanLimits;
  /** Filled in when a real provider is connected. Empty while mocked. */
  providerPriceIds: { stripe?: string; paddle?: string };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceUsdMonthly: 0,
    priceUsdAnnual: 0,
    annualTrialDays: 0,
    tagline: "Everything to get started",
    features: [
      "Personalized calorie & macro targets",
      "Meal ideas from the AI Coach & AI workout plans",
      "Water, sleep, weight and mood tracking",
      "AI Coach: 10 messages a day",
      "AI photo food scans: 5 a day",
      "Barcode lookups with no daily cap",
      "Download all your data anytime",
    ],
    entitlements: ["photo_scanner", "barcode_scanner", "data_export"],
    limits: {
      coachMessagesPerDay: 10,
      planGenerationsPerDay: 2,
      scansPerDay: 5,
      mealTextPerDay: 30,
    },
    providerPriceIds: {},
  },
  pro: {
    id: "pro",
    name: "Pro",
    // DRAFT launch pricing (Nov 2026). Not live: paid_plans_enabled stays
    // false until the owner approves prices and a payment provider is wired.
    priceUsdMonthly: 9.99,
    priceUsdAnnual: 49.99,
    annualTrialDays: 7,
    tagline: "per month, or $49.99 a year",
    features: [
      "Everything in Free",
      "AI Coach: up to 150 messages a day",
      "AI photo food scans: up to 60 a day",
      "AI workout plans: up to 20 a day",
      "AI text meal logging: up to 150 a day",
      "7-day free trial on the annual plan",
    ],
    entitlements: [
      "ai_coach_unlimited",
      "photo_scanner",
      "barcode_scanner",
      "plan_regeneration_unlimited",
      "data_export",
    ],
    limits: {
      coachMessagesPerDay: 150,
      planGenerationsPerDay: 20,
      scansPerDay: 60,
      mealTextPerDay: 150,
    },
    providerPriceIds: {},
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro"];

/** A status that should grant paid entitlements. */
export function isEntitledStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

export interface BillingState {
  plan: PlanId;
  status: SubscriptionStatus;
  provider: string;
  /** True when a real payment provider is wired up and paid plans are sellable. */
  paidPlansEnabled: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const FREE_BILLING_STATE: BillingState = {
  plan: "free",
  status: "active",
  provider: "none",
  paidPlansEnabled: false,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

/** Effective plan: downgrades to free when the subscription lapsed. */
export function effectivePlan(state: Pick<BillingState, "plan" | "status">): PlanId {
  return isEntitledStatus(state.status) ? state.plan : "free";
}

export function hasEntitlement(
  state: Pick<BillingState, "plan" | "status">,
  entitlement: Entitlement,
): boolean {
  return PLANS[effectivePlan(state)].entitlements.includes(entitlement);
}

export function planLimits(state: Pick<BillingState, "plan" | "status">): PlanLimits {
  return PLANS[effectivePlan(state)].limits;
}
