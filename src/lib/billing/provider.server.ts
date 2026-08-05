/**
 * Billing provider abstraction (server-only).
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * The app never talks to a payment processor directly. It talks to a
 * `BillingProvider`. Today the only implementation is `mockProvider`, which is
 * a DEVELOPMENT-ONLY switch that flips the local `subscriptions` row without
 * charging anyone. When Stripe (or Paddle) is enabled, add a second
 * implementation and select it via the `BILLING_PROVIDER` env var — no UI,
 * query, or entitlement code changes.
 *
 * ── Where Stripe plugs in later ────────────────────────────────────────────
 *  1. Enable the Stripe integration (Pro plan) so `STRIPE_SECRET_KEY` exists.
 *  2. Create `src/lib/billing/provider.stripe.server.ts` implementing
 *     `BillingProvider` (checkout session, billing portal session, cancel).
 *  3. Add the price ID to `PLANS.pro.providerPriceIds.stripe` in `plans.ts`.
 *  4. Add a webhook route at `src/routes/api/public/stripe-webhook.ts` that
 *     verifies the signature and calls `applySubscriptionChange` below.
 *  5. Set `BILLING_PROVIDER=stripe` and flip `paid_plans_enabled` to true in
 *     the `billing` app setting from the admin console.
 * Full checklist: `docs/BILLING.md`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  FREE_BILLING_STATE,
  type BillingState,
  type PlanId,
  type SubscriptionStatus,
} from "./plans";

type Client = SupabaseClient<Database>;

export interface CheckoutIntent {
  /** Where the caller should be sent next, when the provider hosts checkout. */
  redirectUrl: string | null;
  /** True when the change was applied immediately (mock provider only). */
  appliedImmediately: boolean;
  message: string;
}

export interface BillingProvider {
  readonly id: string;
  /** True when this provider can actually take money. */
  readonly canCharge: boolean;
  startCheckout(input: {
    client: Client;
    userId: string;
    plan: Exclude<PlanId, "free">;
    returnUrl: string;
  }): Promise<CheckoutIntent>;
  createPortalSession(input: {
    client: Client;
    userId: string;
    returnUrl: string;
  }): Promise<{ redirectUrl: string | null; message: string }>;
  cancelSubscription(input: { client: Client; userId: string }): Promise<{ message: string }>;
}

/** Reads the `billing` row from app_settings; falls back to safe defaults. */
export async function readBillingSettings(
  client: Client,
): Promise<{ provider: string; paidPlansEnabled: boolean }> {
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", "billing")
    .maybeSingle();
  const value = (data?.value ?? {}) as { provider?: string; paid_plans_enabled?: boolean };
  return {
    provider: process.env["BILLING_PROVIDER"] || value.provider || "mock",
    paidPlansEnabled: Boolean(value.paid_plans_enabled),
  };
}

/** Loads (and lazily creates) the caller's subscription row. */
export async function readSubscriptionState(client: Client, userId: string): Promise<BillingState> {
  const settings = await readBillingSettings(client);
  const { data } = await client
    .from("subscriptions")
    .select("plan, status, provider, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return {
      ...FREE_BILLING_STATE,
      provider: settings.provider,
      paidPlansEnabled: settings.paidPlansEnabled,
    };
  }

  return {
    plan: data.plan as PlanId,
    status: data.status as SubscriptionStatus,
    provider: data.provider,
    paidPlansEnabled: settings.paidPlansEnabled,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

/**
 * The single write path for subscription state. Webhook handlers for a real
 * provider should call this and nothing else.
 */
export async function applySubscriptionChange(
  admin: Client,
  input: {
    userId: string;
    provider: string;
    plan: PlanId;
    status: SubscriptionStatus;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    eventType: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      provider: input.provider,
      plan: input.plan,
      status: input.status,
      current_period_end: input.currentPeriodEnd ?? null,
      cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      provider_customer_id: input.providerCustomerId ?? null,
      provider_subscription_id: input.providerSubscriptionId ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Could not update subscription: ${error.message}`);

  const { error: eventError } = await admin.from("billing_events").insert({
    user_id: input.userId,
    provider: input.provider,
    event_type: input.eventType,
    payload: (input.payload ?? {}) as never,
  });
  if (eventError) console.error("billing event write failed", eventError.message);
}

function periodEndInDays(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

/**
 * DEVELOPMENT-ONLY provider. It cannot charge, hosts no checkout page and
 * issues no receipts — it exists so entitlement gating, upgrade flows and the
 * admin surface can be built and tested before a processor is connected.
 * Refuses to run when `NODE_ENV === "production"`.
 */
export const mockProvider: BillingProvider = {
  id: "mock",
  canCharge: false,

  async startCheckout({ client, userId, plan }) {
    assertMockAllowed();
    const admin = await getServiceClient();
    await applySubscriptionChange(admin, {
      userId,
      provider: "mock",
      plan,
      status: "active",
      currentPeriodEnd: periodEndInDays(30),
      eventType: "mock.subscription.activated",
      payload: { plan },
    });
    void client; // caller's RLS client is unused for the mock write path
    return {
      redirectUrl: null,
      appliedImmediately: true,
      message: `Development mode: ${plan} activated locally without payment.`,
    };
  },

  async createPortalSession() {
    assertMockAllowed();
    return {
      redirectUrl: null,
      message: "No billing portal in development mode — manage the plan from Settings.",
    };
  },

  async cancelSubscription({ userId }) {
    assertMockAllowed();
    const admin = await getServiceClient();
    await applySubscriptionChange(admin, {
      userId,
      provider: "mock",
      plan: "free",
      status: "canceled",
      eventType: "mock.subscription.canceled",
    });
    return { message: "Development mode: subscription reset to Free." };
  },
};

function assertMockAllowed(): void {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "Billing is not configured for production. Connect a payment provider (see docs/BILLING.md).",
    );
  }
}

async function getServiceClient(): Promise<Client> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Client;
}

/** Provider registry. Add `stripe` here once implemented. */
export function getBillingProvider(providerId: string): BillingProvider {
  switch (providerId) {
    case "mock":
      return mockProvider;
    case "stripe":
    case "paddle":
      throw new Error(
        `The "${providerId}" billing provider is not implemented yet. See docs/BILLING.md.`,
      );
    default:
      throw new Error(`Unknown billing provider "${providerId}".`);
  }
}
