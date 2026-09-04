import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { isNative, OAUTH_REDIRECT_URL } from "@/lib/native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Loader2 } from "lucide-react";

const PASSWORD_RESET_CALLBACK_URL = "https://nutriai-cyan.vercel.app/auth/callback";
const emailSchema = z.string().trim().email();
const searchSchema = z.object({
  error: z.enum(["invalid-reset-link"]).optional(),
});

export const Route = createFileRoute("/auth/forgot-password")({
  validateSearch: searchSchema,
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
  const { error } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFormatError("Enter a valid email address.");
      return;
    }
    setFormatError(null);
    setSubmitError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: passwordResetRedirectUrl(),
    });
    setLoading(false);

    if (error && shouldShowRequestError(error)) {
      setSubmitError(passwordResetRequestErrorMessage(error));
      return;
    }
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
          {error === "invalid-reset-link" && !sent && (
            <p className="mt-3 text-sm text-destructive">
              Your password reset link is invalid or has expired. Please request a new one.
            </p>
          )}

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
              {submitError && <p className="text-xs text-destructive">{submitError}</p>}
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

function passwordResetRedirectUrl(): string {
  if (isNative) {
    const url = new URL(OAUTH_REDIRECT_URL);
    url.searchParams.set("next", "/auth/reset-password");
    return url.toString();
  }

  const url = new URL(PASSWORD_RESET_CALLBACK_URL);
  url.searchParams.set("next", "/auth/reset-password");
  return url.toString();
}

function shouldShowRequestError(error: { message?: string; status?: number }): boolean {
  const lower = (error.message ?? "").toLowerCase();
  return (
    error.status === 429 ||
    lower.includes("rate") ||
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("failed to") ||
    lower.includes("smtp") ||
    lower.includes("mail")
  );
}

function passwordResetRequestErrorMessage(error: { message?: string; status?: number }): string {
  const lower = (error.message ?? "").toLowerCase();

  if (error.status === 429 || lower.includes("rate")) {
    return "Too many reset emails were requested. Please wait a minute and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("smtp") || lower.includes("mail")) {
    return "Password reset email delivery is not configured correctly. Please contact support.";
  }

  return "We couldn't send the reset email right now. Please try again.";
}
