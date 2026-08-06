import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — NutriAI" },
      {
        name: "description",
        content:
          "Read the NutriAI terms of service: how your account works, acceptable use of our AI coaching, and why our plans are wellness guidance, not medical advice.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <h1 className="font-display text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {new Date().toLocaleDateString()}
        </p>

        <div className="mt-10 space-y-6 text-muted-foreground">
          <section>
            <h2 className="font-display text-2xl text-foreground">Not medical advice</h2>
            <p className="mt-2">
              NutriAI provides general wellness information based on the data you enter. It is not
              medical advice, diagnosis, or treatment. Always consult a qualified healthcare
              professional before making changes to your diet, exercise, or medication.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Your account</h2>
            <p className="mt-2">
              You are responsible for keeping your login credentials secure and for any activity on
              your account.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Acceptable use</h2>
            <p className="mt-2">
              Don't use NutriAI to harass others, misuse the AI features, or attempt to disrupt the
              service.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Changes</h2>
            <p className="mt-2">
              We may update these terms. Material changes will be communicated in the app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
