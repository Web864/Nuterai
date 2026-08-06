import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Leaf } from "lucide-react";

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
      // Give supabase-js time to persist the session from URL fragment / OAuth
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) break;
        await new Promise((r) => setTimeout(r, 150));
      }
      if (cancelled) return;
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
