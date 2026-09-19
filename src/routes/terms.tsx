import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service - NutriAI" },
      { name: "description", content: "Terms and general wellness disclaimer for NutriAI." },
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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 19, 2026</p>

        <div className="mt-10 space-y-6 text-muted-foreground">
          <section>
            <h2 className="font-display text-2xl text-foreground">General wellness only</h2>
            <p className="mt-2">
              NutriAI provides general wellness, nutrition, and fitness guidance. It is not a
              doctor, healthcare professional, or medical device. It does not diagnose medical
              conditions, prescribe medication, replace professional care, or guarantee fitness,
              health, or weight-loss outcomes.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">
              When to seek professional help
            </h2>
            <p className="mt-2">
              Consult a qualified healthcare professional for medical conditions, severe or
              persistent symptoms, pregnancy, eating disorders, medication questions, or
              individualized medical advice. In an emergency, seek immediate local emergency
              assistance instead of relying on NutriAI.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">AI features</h2>
            <p className="mt-2">
              AI-generated content can be incomplete or inaccurate. Use your judgment, do not treat
              it as medical advice, and report unsafe, incorrect, offensive, or medical-concern
              responses using the feedback controls in AI Coach.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Accounts and acceptable use</h2>
            <p className="mt-2">
              You are responsible for protecting your credentials and for activity on your account.
              Do not misuse the service, attempt to access another person's data, disrupt the
              service, or use AI features to create harmful content.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Subscriptions</h2>
            <p className="mt-2">
              If a paid plan is offered, its displayed price, billing period, auto-renewal terms,
              trial terms, and cancellation instructions apply at purchase. Digital subscriptions
              purchased through Google Play are managed according to Google Play billing and
              cancellation processes.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Changes and contact</h2>
            <p className="mt-2">
              We may update these terms when the service or legal requirements change. Questions can
              be sent to support@nutriai.app. See the{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>{" "}
              for data handling information.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
