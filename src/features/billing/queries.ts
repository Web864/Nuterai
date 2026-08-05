import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  cancelSubscription,
  getBillingState,
  openBillingPortal,
  startSubscriptionCheckout,
} from "@/lib/billing.functions";
import {
  FREE_BILLING_STATE,
  effectivePlan,
  hasEntitlement,
  planLimits,
  type BillingState,
  type Entitlement,
} from "@/lib/billing/plans";

export const billingStateQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["billing", "state", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<BillingState> => await getBillingState(),
  });

/** Convenience wrapper so components can gate features in one line. */
export function useEntitlements(state: BillingState | undefined) {
  const resolved = state ?? FREE_BILLING_STATE;
  return {
    state: resolved,
    plan: effectivePlan(resolved),
    limits: planLimits(resolved),
    can: (entitlement: Entitlement) => hasEntitlement(resolved, entitlement),
  };
}

export function useStartCheckout(userId: string | undefined) {
  const qc = useQueryClient();
  const fn = useServerFn(startSubscriptionCheckout);
  return useMutation({
    mutationFn: async () =>
      await fn({
        data: {
          plan: "pro" as const,
          returnUrl: `${window.location.origin}/settings`,
        },
      }),
    onSuccess: (result) => {
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["billing", "state", userId] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not start checkout"),
  });
}

export function useOpenBillingPortal() {
  const fn = useServerFn(openBillingPortal);
  return useMutation({
    mutationFn: async () =>
      await fn({ data: { returnUrl: `${window.location.origin}/settings` } }),
    onSuccess: (result) => {
      if (result.redirectUrl) window.location.href = result.redirectUrl;
      else toast.info(result.message);
    },
    onError: (e: Error) => toast.error(e.message || "Billing portal unavailable"),
  });
}

export function useCancelSubscription(userId: string | undefined) {
  const qc = useQueryClient();
  const fn = useServerFn(cancelSubscription);
  return useMutation({
    mutationFn: async () => await fn(),
    onSuccess: (result) => {
      toast.success(result.message);
      qc.invalidateQueries({ queryKey: ["billing", "state", userId] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not cancel subscription"),
  });
}
