# Billing architecture

NutriAI's subscription system is **provider-agnostic**. The app never talks to a
payment processor directly; it talks to a `BillingProvider`.

## Current state

| Piece                                        | Status                                                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Plan catalogue & entitlements                | ✅ `src/lib/billing/plans.ts`                                                                                   |
| Provider interface                           | ✅ `src/lib/billing/provider.server.ts`                                                                         |
| Mock provider (dev only, cannot charge)      | ✅ same file                                                                                                    |
| Server API                                   | ✅ `src/lib/billing.functions.ts`                                                                               |
| Client bindings + gating hook                | ✅ `src/features/billing/queries.ts`                                                                            |
| Settings UI                                  | ✅ `src/features/billing/BillingPanel.tsx`                                                                      |
| Database (`subscriptions`, `billing_events`) | ✅ RLS: users read their own, admins read all; writes are service-role only                                     |
| Feature flag                                 | ✅ `app_settings.billing` → `{ provider, paid_plans_enabled }`, overridable with the `BILLING_PROVIDER` env var |
| **Real Stripe checkout**                     | ❌ Not wired up yet: requires a Stripe account and API keys                                                     |

While `paid_plans_enabled` is `false`, upgrade buttons are disabled and the UI
tells users paid plans aren't live. Nothing pretends to charge.

## Data flow

```text
UI  ──▶ features/billing/queries.ts ──▶ lib/billing.functions.ts (server fn, auth-checked)
                                              │
                                              ▼
                                  lib/billing/provider.server.ts
                                     ├── mockProvider (dev)
                                     └── stripeProvider (to be added)
                                              │
                          applySubscriptionChange()  ← the ONLY write path
                                              ▼
                             subscriptions + billing_events tables
```

Entitlements are read from `plans.ts` only. Adding a paid capability means
adding an `Entitlement` string and listing it on the plan — no other change.

## Plugging in Stripe later

1. Create a Stripe account and set `STRIPE_SECRET_KEY` and
   `STRIPE_WEBHOOK_SECRET` as backend secrets.
2. Create the Pro product/price in Stripe and put the price ID in
   `PLANS.pro.providerPriceIds.stripe`.
3. Add `src/lib/billing/provider.stripe.server.ts` exporting a `BillingProvider`:
   - `startCheckout` → create a Checkout Session, return its URL as `redirectUrl`.
   - `createPortalSession` → create a Billing Portal session.
   - `cancelSubscription` → set `cancel_at_period_end` on the Stripe subscription.
4. Register it in `getBillingProvider()` (replace the `throw` for `"stripe"`).
5. Add the webhook at `src/routes/api/public/stripe-webhook.ts`: verify the
   signature, then call `applySubscriptionChange()` for
   `checkout.session.completed`, `customer.subscription.updated`, and
   `customer.subscription.deleted`.
6. Set `BILLING_PROVIDER=stripe` and flip `paid_plans_enabled` to `true` in the
   admin console (System settings → `billing`).

No UI, query, or entitlement file needs to change.

## Launch plan (Nov 2026)

**Which processor for which surface.** Google Play requires Google Play
Billing for digital subscriptions bought inside the Android app. Stripe alone
is only allowed for purchases made on the website. So:

| Surface      | Processor                                                                    | Provider id   |
| ------------ | ---------------------------------------------------------------------------- | ------------- |
| Website      | Stripe Checkout + Billing Portal                                             | `stripe`      |
| Android app  | Google Play Billing (a Capacitor plugin, or RevenueCat to cover both stores) | `google_play` |
| iOS (future) | Apple StoreKit                                                               | `app_store`   |

Each one becomes a `BillingProvider`. Its webhook or server notification
(Stripe webhooks, Google Play Real-time Developer Notifications) calls
`applySubscriptionChange()`. That keeps the `subscriptions` table as the single
source of entitlements on every platform.

**Recommended prices** (from competitor research, Nov 2026):

- Pro monthly: $9.99
- Pro annual: $49.99 (about 58% off monthly). Make it the default choice on
  the paywall.
- 7-day free trial on annual only
- Regional prices for PK, IN and the Gulf, set in Play Console and Stripe
  (for example, PKR 999/month or PKR 4,999/year). Treat these as a starting
  point to test, not final numbers.

**Needs the owner (cannot be done in code):**

1. A Stripe account (business details, bank payout), with keys stored as
   server secrets.
2. A Google Play Console payments profile and a subscription product, such as
   `nutriai_pro` with `monthly` and `annual` base plans.
3. A Google Cloud service account for the Play Developer API, used to verify
   purchases and receive RTDN.
4. Signed-off refund, cancellation and auto-renewal wording in the Terms.

## Mock provider rules

- Refuses to run when `NODE_ENV === "production"`.
- Writes only to the local `subscriptions` row; issues no receipts.
- Exists purely so entitlement gating and upgrade flows are testable.
