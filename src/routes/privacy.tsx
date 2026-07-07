import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — NutriAI" },
      { name: "description", content: "How NutriAI collects, uses, and protects your health data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <h1 className="font-display text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {new Date().toLocaleDateString()}</p>

        <div className="mt-10 space-y-6 text-muted-foreground">
          <section>
            <h2 className="font-display text-2xl text-foreground">What we collect</h2>
            <p className="mt-2">
              To personalize your plan, NutriAI collects the information you provide during onboarding (age, height, weight, dietary preferences,
              activity level, goals) and any data you choose to log (meals, workouts, water, sleep, mood, weight).
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">How we use it</h2>
            <p className="mt-2">
              We use your data solely to generate your personalized plan, adapt it over time, and show your progress. We do not sell your data.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Where it's stored</h2>
            <p className="mt-2">
              Your data lives in secure managed cloud infrastructure with row-level security so only you can access it. You can delete your account
              and all your data at any time from your settings.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">AI processing</h2>
            <p className="mt-2">
              When you use AI features, prompts and relevant context are sent to trusted AI providers for processing. Providers are contractually
              prohibited from training on your data.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Contact</h2>
            <p className="mt-2">Questions? Reach out at support@nutriai.app.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
