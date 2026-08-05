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
  | "advanced_analytics"
  | "data_export";

export interface PlanLimits {
  /** Coach messages per rolling day. `null` = unlimited. */
  coachMessagesPerDay: number | null;
  /** AI workout plan generations per rolling day. `null` = unlimited. */
  planGenerationsPerDay: number | null;
  /** Photo/barcode scans per rolling day. `null` = unlimited. */
  scansPerDay: number | null;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceUsdMonthly: number;
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
    tagline: "Everything to get started",
    features: [
      "Personalized calorie & macro targets",
      "Daily meal & workout suggestions",
      "Water, sleep, weight and mood tracking",
      "AI coach (10 messages/day)",
      "5 food scans/day",
    ],
    entitlements: ["photo_scanner", "barcode_scanner"],
    limits: { coachMessagesPerDay: 10, planGenerationsPerDay: 1, scansPerDay: 5 },
    providerPriceIds: {},
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsdMonthly: 9.99,
    tagline: "per month · billed monthly",
    features: [
      "Unlimited AI coach conversations",
      "Unlimited photo + barcode scanning",
      "Unlimited meal & workout plan regeneration",
      "Advanced analytics & data export",
      "Priority model routing",
    ],
    entitlements: [
      "ai_coach_unlimited",
      "photo_scanner",
      "barcode_scanner",
      "plan_regeneration_unlimited",
      "advanced_analytics",
      "data_export",
    ],
    limits: { coachMessagesPerDay: null, planGenerationsPerDay: null, scansPerDay: null },
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
