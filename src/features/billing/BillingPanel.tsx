import { useQuery } from "@tanstack/react-query";
import { CreditCard, Sparkles, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  billingStateQueryOptions,
  useCancelSubscription,
  useEntitlements,
  useOpenBillingPortal,
  useStartCheckout,
} from "./queries";
import { PLANS } from "@/lib/billing/plans";

/** Billing surface for Settings. Provider-agnostic — see docs/BILLING.md. */
export function BillingPanel({ userId }: { userId: string | undefined }) {
  const stateQuery = useQuery(billingStateQueryOptions(userId));
  const { state, plan } = useEntitlements(stateQuery.data);
  const checkout = useStartCheckout(userId);
  const portal = useOpenBillingPortal();
  const cancel = useCancelSubscription(userId);

  const definition = PLANS[plan];
  const isPro = plan === "pro";
  const providerConnected = state.paidPlansEnabled;

  return (
    <section aria-labelledby="billing-heading" className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 id="billing-heading" className="flex items-center gap-2 font-display text-xl">
            <CreditCard className="h-5 w-5 text-accent" aria-hidden="true" /> Plan &amp; billing
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re on the <strong>{definition.name}</strong> plan.
            {state.currentPeriodEnd
              ? ` Renews ${new Date(state.currentPeriodEnd).toLocaleDateString()}.`
              : ""}
          </p>
        </div>
        <Badge variant={isPro ? "default" : "secondary"}>{definition.name}</Badge>
      </header>

      {!providerConnected && (
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
          <p className="text-muted-foreground">
            Paid plans aren&apos;t live yet — no payment provider is connected, so nothing can be
            charged. Every Free feature works normally.
          </p>
        </div>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {definition.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 text-accent" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        {!isPro && (
          <Button
            className="rounded-full"
            disabled={!providerConnected || checkout.isPending}
            onClick={() => checkout.mutate()}
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            {providerConnected ? "Upgrade to Pro" : "Pro coming soon"}
          </Button>
        )}
        {isPro && (
          <>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={portal.isPending}
              onClick={() => portal.mutate()}
            >
              Manage billing
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              Cancel plan
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
