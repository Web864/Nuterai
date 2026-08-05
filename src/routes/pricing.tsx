import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check, Leaf } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — NutriAI" },
      {
        name: "description",
        content:
          "Start free with NutriAI. Upgrade to Pro for unlimited AI coaching and advanced features.",
      },
      { property: "og:title", content: "NutriAI Pricing" },
      {
        property: "og:description",
        content: "Simple pricing. Free forever. Pro when you're ready.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">Pricing</p>
          <h1 className="mt-2 font-display text-5xl">Simple, honest pricing.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start free with everything you need. Upgrade to Pro when you want unlimited AI coaching
            and advanced insights.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Plan
            name={PLANS.free.name}
            price="$0"
            tagline={PLANS.free.tagline}
            features={PLANS.free.features}
            cta={
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
              </Link>
            }
          />
          <Plan
            highlight
            name={PLANS.pro.name}
            price={`$${PLANS.pro.priceUsdMonthly}`}
            tagline={PLANS.pro.tagline}
            features={PLANS.pro.features}
            cta={<span>Not yet available</span>}
          />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pro isn&apos;t on sale yet — checkout opens once payments are live. Everything listed
          under Free is available today.
        </p>
      </div>
    </div>
  );
}

function Plan({
  name,
  price,
  tagline,
  features,
  cta,
  highlight,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  cta: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-hero"
          : "rounded-3xl border border-border/60 bg-card p-8 shadow-soft"
      }
    >
      <p
        className={
          highlight
            ? "text-xs uppercase tracking-wider opacity-70"
            : "text-xs uppercase tracking-wider text-accent"
        }
      >
        {name}
      </p>
      <p className="mt-3 font-display text-5xl">{price}</p>
      <p className={highlight ? "mt-1 text-sm opacity-80" : "mt-1 text-sm text-muted-foreground"}>
        {tagline}
      </p>
      <ul className="mt-6 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              className={highlight ? "mt-0.5 h-4 w-4 opacity-90" : "mt-0.5 h-4 w-4 text-accent"}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        size="lg"
        className="mt-8 w-full rounded-full"
        variant={highlight ? "secondary" : "default"}
      >
        {cta}
      </Button>
    </div>
  );
}
