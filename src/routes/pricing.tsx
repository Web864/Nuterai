import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing/plans";
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
    <div className="premium-shell min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <Link to="/" className="mb-12 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pricing</p>
          <h1 className="mt-3 text-balance font-display text-5xl sm:text-6xl">Simple, honest pricing.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start free with everything you need. Upgrade to Pro when you want unlimited AI coaching
            and advanced insights.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-5 md:grid-cols-2">
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
          ? "rounded-[2rem] border border-primary/35 bg-gradient-hero p-7 text-foreground shadow-hero sm:p-8"
          : "premium-card-hover rounded-[2rem] border border-border/70 bg-card/90 p-7 shadow-soft sm:p-8"
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
        className="mt-8 w-full rounded-xl"
        variant={highlight ? "secondary" : "default"}
      >
        {cta}
      </Button>
    </div>
  );
}
