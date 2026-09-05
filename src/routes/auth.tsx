import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { isNative, OAUTH_REDIRECT_URL } from "@/lib/native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Leaf, Loader2 } from "lucide-react";

const EMAIL_CONFIRMATION_CALLBACK_URL = "https://nutriai-cyan.vercel.app/auth/callback";
const PASSWORD_RESET_CALLBACK_URL = "https://nutriai-cyan.vercel.app/auth/callback";
const forgotEmailSchema = z.string().trim().email();

const searchSchema = z.object({
  next: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — NutriAI" },
      {
        name: "description",
        content: "Sign in to NutriAI to access your personalized AI health coach.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ search }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: search.next ?? "/dashboard" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const { next, mode } = Route.useSearch();
  const [tab, setTab] = useState<"signin" | "signup">(mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  useEffect(() => {
    if (mode) setTab(mode);
  }, [mode]);

  const nextPath = safeNext(next);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const message = authErrorMessage(error);
      toast.error(message);
      if (isUnconfirmedEmailError(error)) {
        setPendingConfirmationEmail(email.trim());
        setTab("signup");
      }
      return;
    }
    toast.success("Welcome back!");
    window.location.href = nextPath;
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const normalizedEmail = email.trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: confirmationRedirectUrl(nextPath),
        data: { full_name: name, name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }

    if (data.session) {
      toast.success("Account created. You're signed in.");
      window.location.href = nextPath;
      return;
    }

    setPendingConfirmationEmail(normalizedEmail);
    toast.success("Confirmation email sent. Check your email to confirm your account.");
  }

  async function handleResendConfirmation() {
    const normalizedEmail = pendingConfirmationEmail.trim() || email.trim();
    if (!normalizedEmail) {
      toast.error("Enter your email address first.");
      return;
    }
    if (Date.now() < resendAvailableAt) {
      toast.info("Please wait a moment before requesting another confirmation email.");
      return;
    }

    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: confirmationRedirectUrl(nextPath),
      },
    });
    setResendLoading(false);

    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }

    setPendingConfirmationEmail(normalizedEmail);
    setResendAvailableAt(Date.now() + 60_000);
    toast.success("Confirmation email sent. Check your email to confirm your account.");
  }

  function handleForgotOpenChange(open: boolean) {
    setForgotOpen(open);
    if (open) {
      setForgotEmail(email.trim());
      setForgotError(null);
      setForgotSent(false);
      return;
    }
    setForgotLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (forgotLoading) return;

    const parsed = forgotEmailSchema.safeParse(forgotEmail);
    if (!parsed.success) {
      setForgotError("Enter a valid email address.");
      return;
    }

    setForgotError(null);
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: passwordResetRedirectUrl(),
    });
    setForgotLoading(false);

    if (error && shouldShowPasswordResetRequestError(error)) {
      setForgotError(passwordResetRequestErrorMessage(error));
      return;
    }

    setForgotSent(true);
  }

  async function handleGoogle() {
    setLoading(true);

    if (isNative) {
      // Google blocks OAuth from an embedded WebView user agent, so open the
      // system browser instead and let the nutriai://auth-callback deep link
      // (handled in src/lib/native.ts) bring the user back into the app.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        setLoading(false);
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });
    if (error) {
      setLoading(false);
      toast.error("Google sign-in failed. Please try again.");
    }
    // On success the browser navigates to Google immediately; this never returns.
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

        <h1 className="sr-only">Sign in to NutriAI</h1>
        <div className="w-full rounded-3xl bg-card p-8 shadow-hero">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 rounded-full">
              <TabsTrigger value="signin" className="rounded-full">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">
                Create account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onClick={() => handleForgotOpenChange(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-up">Password</Label>
                  <Input
                    id="password-up"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
              {pendingConfirmationEmail && (
                <div className="mt-5 rounded-lg border border-border bg-secondary/50 p-4 text-sm">
                  <p className="font-medium text-foreground">
                    Check your email to confirm your account.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    We sent a confirmation link to {pendingConfirmationEmail}.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading || Date.now() < resendAvailableAt}
                  >
                    {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend confirmation email
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-2">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <Dialog open={forgotOpen} onOpenChange={handleForgotOpenChange}>
          <DialogContent className="mx-4 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-lg">
            <DialogHeader>
              <DialogTitle>Forgot Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a password reset link.
              </DialogDescription>
            </DialogHeader>

            {forgotSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Password reset link sent. Please check your email.
                </p>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" className="w-full sm:w-auto">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-password-email">Email</Label>
                  <Input
                    id="forgot-password-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
                {forgotError && <p className="text-sm text-destructive">{forgotError}</p>}
                <DialogFooter className="gap-2 sm:gap-0">
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={forgotLoading}>
                      Close
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={forgotLoading}>
                    {forgotLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function safeNext(next: string | undefined): string {
  if (!next) return "/dashboard";
  if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

function passwordResetRedirectUrl(): string {
  const callbackUrl = isNative ? OAUTH_REDIRECT_URL : PASSWORD_RESET_CALLBACK_URL;
  return `${callbackUrl}?next=/auth/reset-password`;
}

function confirmationRedirectUrl(nextPath: string): string {
  const url = new URL(EMAIL_CONFIRMATION_CALLBACK_URL);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

function shouldShowPasswordResetRequestError(error: {
  message?: string;
  status?: number;
}): boolean {
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

function isUnconfirmedEmailError(error: { message?: string; code?: string }): boolean {
  const lower = (error.message ?? "").toLowerCase();
  return error.code === "email_not_confirmed" || lower.includes("email not confirmed");
}

function authErrorMessage(error: { message?: string; status?: number; code?: string }): string {
  const raw = error.message ?? "";
  const lower = raw.toLowerCase();

  if (isUnconfirmedEmailError(error)) {
    return "Check your email to confirm your account before signing in.";
  }
  if (lower.includes("already confirmed")) {
    return "This email is already confirmed. Please sign in.";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "That email already has an account. Sign in, or resend the confirmation email if you have not confirmed it yet.";
  }
  if (lower.includes("rate") || error.status === 429) {
    return "Too many confirmation emails were requested. Please wait a minute and try again.";
  }
  if (lower.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }
  if (lower.includes("email") && lower.includes("invalid")) {
    return "Enter a valid email address.";
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("failed to")) {
    return "Network error. Check your connection and try again.";
  }
  if (lower.includes("smtp") || lower.includes("email provider") || lower.includes("mail")) {
    return "Email delivery is not configured correctly. Please contact support.";
  }

  return raw || "Authentication failed. Please try again.";
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
