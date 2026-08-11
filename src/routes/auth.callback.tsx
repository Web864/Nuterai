import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Leaf } from "lucide-react";

// Captured at module evaluation time, before the router's own hydration can
// touch window.location (a known class of bug: SPA routers reconstructing
// the URL from their internal {pathname, search} model can silently drop a
// hash fragment they don't track, and by the time a useEffect runs it may
// already be gone). exchangeCodeForSession/setSession below use these
// snapshots instead of re-reading window.location live.
const capturedSearch = typeof window !== "undefined" ? window.location.search : "";
const capturedHash = typeof window !== "undefined" ? window.location.hash : "";

const search = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth/callback")({
  validateSearch: search,
  head: () => ({
    meta: [{ title: "Signing you in — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const { next } = Route.useSearch();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      // Don't rely solely on supabase-js's own auto-detection (which reads
      // window.location fresh, at whatever moment its lazily-constructed
      // client happens to initialize) — exchange explicitly using the
      // snapshot taken at module load. Covers both PKCE (email confirmation,
      // OAuth — this client uses flowType: "pkce") and, defensively, any
      // legacy implicit-flow hash tokens.
      const params = new URLSearchParams(capturedSearch);
      const code = params.get("code");
      const oauthError = params.get("error_description") || params.get("error");
      const hashParams = new URLSearchParams(capturedHash.replace(/^#/, ""));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      // Temporary diagnostics — presence/booleans only, never values. Remove
      // once the production sign-in failure this was added for is confirmed
      // fixed or its real cause is captured.
      const hasVerifier = Object.keys(localStorage).some((k) => k.endsWith("-code-verifier"));
      console.info("[auth/callback] reached", {
        origin: window.location.origin,
        pathname: window.location.pathname,
        hasCode: !!code,
        hasOauthError: !!oauthError,
        hasHashTokens: !!(access_token && refresh_token),
        hasVerifier,
      });

      let exchangeError: { message: string } | null = null;
      if (oauthError) {
        exchangeError = { message: oauthError };
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        exchangeError = error;
      } else if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        exchangeError = error;
      }

      if (exchangeError) {
        console.error("[auth/callback] sign-in failed:", exchangeError.message);
      }

      // Give supabase-js time to persist the session from URL fragment / OAuth
      let session = null;
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          session = data.session;
          break;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
      if (cancelled) return;

      console.info("[auth/callback] result", {
        hadExchangeError: !!exchangeError,
        foundSession: !!session,
      });

      if (!session) {
        toast.error(exchangeError?.message || "Sign-in failed. Please try again.");
        window.location.replace("/auth");
        return;
      }
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      window.location.replace(target);
    }
    finish();
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero">
      <div className="flex flex-col items-center gap-4 text-primary-foreground">
        <h1 className="sr-only">Verifying your account</h1>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
          <Leaf className="h-6 w-6" />
        </span>
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm opacity-80">Signing you in…</p>
      </div>
    </div>
  );
}
