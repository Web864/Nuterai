import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — NutriAI" },
      {
        name: "description",
        content: "How to permanently delete your NutriAI account and data.",
      },
    ],
  }),
  component: DeleteAccountInfoPage,
});

function DeleteAccountInfoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <h1 className="font-display text-4xl">Delete your account</h1>
        <p className="mt-3 text-muted-foreground">
          NutriAI's Android app and website are the same product — there's nothing to delete
          separately from an app store. This page explains exactly what happens.
        </p>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="font-display text-xl text-foreground">If you can sign in</h2>
            <p className="mt-2 text-muted-foreground">
              Go to <span className="text-foreground">Settings → Delete account</span> and confirm.
              Deletion is immediate and permanent.
            </p>
            <Button asChild className="mt-3 rounded-full">
              <Link to="/auth" search={{ next: "/settings/delete-account" }}>
                Sign in to delete my account
              </Link>
            </Button>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">What gets deleted</h2>
            <p className="mt-2 text-muted-foreground">
              Your profile, goals, nutrition and workout history, AI coach conversations, reminders,
              subscription, and social data (posts, friends, achievements) are all permanently
              removed. A de-identified record of any admin/moderation actions taken on your account
              may be retained for audit purposes, with no personal data attached.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">If you can't sign in</h2>
            <p className="mt-2 text-muted-foreground">
              Email <span className="text-foreground">support@nutriai.app</span> from the address on
              your account and we'll verify you and delete your account manually.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-foreground">More detail</h2>
            <p className="mt-2 text-muted-foreground">
              See our{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                privacy policy
              </Link>{" "}
              for the full data-handling picture.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
