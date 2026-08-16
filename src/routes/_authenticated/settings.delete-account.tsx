import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";
import { Route as AuthedRoute } from "./route";
import { supabase } from "@/integrations/supabase/client";
import { getAccountDeletionSummary, deleteMyAccount } from "@/lib/account.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings/delete-account")({
  head: () => ({
    meta: [{ title: "Delete account — NutriAI" }, { name: "robots", content: "noindex" }],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { userId, user } = AuthedRoute.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const summary = useQuery({
    queryKey: ["account", "deletion-summary", userId],
    queryFn: () => getAccountDeletionSummary(),
  });

  // Google-only accounts have no password to re-verify; email/password
  // accounts are asked to re-enter theirs before the destructive action.
  const hasPasswordIdentity = user.identities
    ? user.identities.some((i) => i.provider === "email")
    : true;

  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confirmText === "DELETE" && (!hasPasswordIdentity || password.length > 0);

  async function handleDelete() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (hasPasswordIdentity) {
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email ?? "",
          password,
        });
        if (reauthError) {
          setError("That password wasn't correct. Please try again.");
          setBusy(false);
          return;
        }
      }

      await deleteMyAccount({ data: { confirmation: "DELETE" } });

      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const s = summary.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 rounded-full">
          <Link to="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to settings
          </Link>
        </Button>

        <h1 className="font-display text-4xl">Delete account</h1>
        <p className="mt-1 text-muted-foreground">
          This permanently deletes your NutriAI account and everything in it. There is no undo.
        </p>

        <Card className="mt-8 rounded-3xl border-destructive/40 shadow-soft">
          <CardHeader className="flex-row items-center gap-3">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="font-display text-xl">This will remove</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading your account summary…</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <SummaryItem label="Meals logged" value={s?.meals} />
                <SummaryItem label="Workouts" value={s?.workouts} />
                <SummaryItem label="Coach conversations" value={s?.coachThreads} />
                <SummaryItem label="Community posts" value={s?.posts} />
                <SummaryItem label="Friends" value={s?.friends} />
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              Your profile, goals, nutrition and workout history, AI coach conversations,
              subscription, and social data are all permanently deleted. A de-identified record of
              any admin/moderation actions on your account may be retained for audit purposes, with
              no personal data attached. See our{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>{" "}
              for details.
            </p>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-3xl border-destructive/40 shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-xl">Confirm deletion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="rounded-xl"
                autoComplete="off"
                disabled={busy}
              />
            </div>

            {hasPasswordIdentity && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Enter your password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="rounded-xl"
                  disabled={busy}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              variant="destructive"
              className="w-full rounded-full"
              disabled={!canSubmit || busy}
              onClick={handleDelete}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Permanently delete my account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number | undefined }) {
  return (
    <li className="rounded-xl border border-border/60 bg-card/50 p-3">
      <p className="text-lg font-semibold tabular-nums">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </li>
  );
}
