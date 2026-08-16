import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Loader2 } from "lucide-react";

const emailSchema = z.string().trim().email();

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset your password — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordPage,
});

// Fixed confirmation text shown for every submission — a valid-looking email
// and an unregistered one get an identical response, so this form can't be
// used to test which addresses have an account.
const GENERIC_CONFIRMATION =
  "If an account exists for that email, we've sent a link to reset your password.";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFormatError("Enter a valid email address.");
      return;
    }
    setFormatError(null);
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
    });
    setLoading(false);
    // Always show the same confirmation, regardless of the API result, so
    // the response never reveals whether the address has an account.
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow opacity-70" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <Link to="/" className="mb-10 flex items-center gap-2 text-primary-foreground">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
            <Leaf className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl tracking-tight">NutriAI</span>
        </Link>

        <div className="w-full rounded-3xl bg-card p-8 shadow-hero">
          <h1 className="font-display text-2xl">Reset your password</h1>

          {sent ? (
            <p className="mt-4 text-sm text-muted-foreground">{GENERIC_CONFIRMATION}</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a link to reset your password.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {formatError && <p className="text-xs text-destructive">{formatError}</p>}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/auth" className="underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
