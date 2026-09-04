import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Leaf, Loader2 } from "lucide-react";

const PASSWORD_RECOVERY_STORAGE_KEY = "nutriai:password-recovery-session";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [{ title: "Set a new password — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    const hasRecoverySession = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "true";
    if (!data.session || !hasRecoverySession) {
      throw redirect({
        to: "/auth/forgot-password",
        search: { error: "invalid-reset-link" },
      });
    }
  },
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordIssues = useMemo(() => validatePassword(password), [password]);
  const canSubmit =
    !loading && passwordIssues.length === 0 && password === confirm && confirm.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    if (passwordIssues.length > 0) {
      setError(passwordIssues[0]);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    const hasRecoverySession = sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "true";
    if (!hasRecoverySession) {
      setError("Your password reset link is invalid or has expired. Please request a new one.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(resetPasswordErrorMessage(updateError));
      return;
    }

    sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
    await supabase.auth.signOut({ scope: "others" });
    setLoading(false);
    setSuccess(true);
    toast.success("Password updated.");
    setTimeout(() => {
      void navigate({ to: "/dashboard", replace: true });
    }, 900);
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
          <h1 className="font-display text-2xl">Set a new password</h1>

          {success ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Your password has been updated. Taking you to your dashboard...
              </p>
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <PasswordField
                id="new-password"
                label="New password"
                value={password}
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                onChange={setPassword}
              />
              {password && (
                <p
                  className={
                    passwordIssues.length ? "text-xs text-muted-foreground" : "text-xs text-primary"
                  }
                >
                  {passwordIssues[0] ?? "Password strength looks good."}
                </p>
              )}
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirm}
                shown={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                onChange={setConfirm}
              />
              {confirm && password !== confirm && (
                <p className="text-xs text-destructive">Passwords don't match.</p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" size="lg" disabled={!canSubmit}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/auth/forgot-password" className="underline underline-offset-2">
                  Request a new reset email
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  shown,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  shown: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-11"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={shown ? "Hide password" : "Show password"}
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function validatePassword(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("Use at least 8 characters.");
  if (!/[A-Z]/.test(password)) issues.push("Add an uppercase letter.");
  if (!/[a-z]/.test(password)) issues.push("Add a lowercase letter.");
  if (!/[0-9]/.test(password)) issues.push("Add a number.");
  return issues;
}

function resetPasswordErrorMessage(error: { message?: string; status?: number }): string {
  const lower = (error.message ?? "").toLowerCase();

  if (lower.includes("weak") || lower.includes("password")) {
    return "Choose a stronger password before continuing.";
  }
  if (lower.includes("expired") || lower.includes("invalid") || lower.includes("token")) {
    return "Your password reset link is invalid or has expired. Please request a new one.";
  }
  if (error.status === 429 || lower.includes("rate")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to")) {
    return "Network error. Check your connection and try again.";
  }

  return "We couldn't update your password. Please request a new reset email and try again.";
}
