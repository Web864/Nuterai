/**
 * Billing API — thin server-function wrappers. All logic lives in
 * `./billing/provider.server.ts`. Stripe plugs in behind the same functions;
 * see `docs/BILLING.md`.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getBillingProvider,
  readBillingSettings,
  readSubscriptionState,
} from "./billing/provider.server";

export const getBillingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => readSubscriptionState(context.supabase, context.userId));

export const startSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ plan: z.literal("pro"), returnUrl: z.string().url().max(500) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const settings = await readBillingSettings(context.supabase);
    const provider = getBillingProvider(settings.provider);
    if (!provider.canCharge && settings.paidPlansEnabled) {
      throw new Error("Paid plans are enabled but no payment provider is connected.");
    }
    return provider.startCheckout({
      client: context.supabase,
      userId: context.userId,
      plan: data.plan,
      returnUrl: data.returnUrl,
    });
  });

export const openBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ returnUrl: z.string().url().max(500) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const settings = await readBillingSettings(context.supabase);
    return getBillingProvider(settings.provider).createPortalSession({
      client: context.supabase,
      userId: context.userId,
      returnUrl: data.returnUrl,
    });
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const settings = await readBillingSettings(context.supabase);
    return getBillingProvider(settings.provider).cancelSubscription({
      client: context.supabase,
      userId: context.userId,
    });
  });
