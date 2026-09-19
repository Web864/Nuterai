import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - NutriAI" },
      {
        name: "description",
        content: "How NutriAI collects, uses, and protects account and wellness information.",
      },
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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: September 19, 2026</p>

        <div className="mt-10 space-y-6 text-muted-foreground">
          <section>
            <h2 className="font-display text-2xl text-foreground">Scope</h2>
            <p className="mt-2">
              NutriAI is a general wellness, nutrition, and fitness assistant. This policy explains
              how we handle information when you use the website or Android app.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Information we collect</h2>
            <p className="mt-2">
              We collect account information such as email and authentication identifiers. When you
              provide it, we may also collect profile and wellness information including age, sex,
              height, weight, goals, activity level, dietary preferences, medical-condition
              selections, meals, nutrition and water logs, workouts, plans, progress, reminders, and
              notification preferences. AI features process the prompts, Coach messages, generated
              replies, and relevant profile or log context needed to answer your request. Food
              scanning may process images you choose to provide.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">How we use information</h2>
            <p className="mt-2">
              We use information to create and secure accounts, personalize wellness guidance, log
              progress, provide reminders, operate AI features, maintain subscriptions where
              enabled, prevent abuse, and improve reliability and safety. NutriAI does not sell
              personal information or use it for targeted advertising based on this repository's
              implementation.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Service providers</h2>
            <p className="mt-2">
              Supabase provides authentication and database infrastructure. Vercel hosts the web
              service. Gemini is the primary AI provider and OpenAI may process a request when the
              fallback provider is used. Device notification services process local reminder
              delivery. These providers process information to operate the feature you request; this
              is service-provider processing, not a sale of data. Their own terms and policies may
              also apply.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">
              Storage, security, and retention
            </h2>
            <p className="mt-2">
              We use HTTPS for service traffic and Supabase row-level access controls for user-owned
              data. No system is perfectly secure. We retain account and wellness information while
              your account is active or as needed to provide the service. Limited de-identified
              security or moderation audit metadata may be retained where necessary for legal,
              fraud-prevention, or security purposes.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Your choices and deletion</h2>
            <p className="mt-2">
              You can review and update information in the app. You may permanently delete your
              account in Settings -&gt; Delete account. This removes the authentication account and
              user-owned profile, goals, logs, plans, reminders, Coach conversations, subscription
              records, social data, and feedback through cleanup and database cascades. If you
              cannot sign in, use our{" "}
              <Link to="/delete-account" className="underline underline-offset-2">
                account deletion page
              </Link>
              . We may retain only de-identified audit metadata where required.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Children</h2>
            <p className="mt-2">
              NutriAI is not designed or marketed for children. Do not use the service if you are
              below the minimum age required to consent to data processing where you live. We do not
              knowingly build parental-consent workflows into this app.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-foreground">Changes and contact</h2>
            <p className="mt-2">
              We may update this policy when the service or legal requirements change. For privacy
              requests or questions, contact support@nutriai.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
