import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing/plans";
import { Check } from "lucide-react";
import { Breadcrumbs, FaqList, PublicLayout } from "@/components/site/PublicLayout";
import { breadcrumbSchema, faqPageSchema, pageHead, softwareApplicationSchema } from "@/lib/seo";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
];

const pro = PLANS.pro;
const proMonthlyFromAnnual = (pro.priceUsdAnnual / 12).toFixed(2);
const annualSavingPct = Math.round((1 - pro.priceUsdAnnual / (pro.priceUsdMonthly * 12)) * 100);

const PRICING_FAQS = [
  {
    question: "Is NutriAI really free?",
    answer:
      "Yes. The Free plan has no time limit and needs no credit card. It includes calorie and macro targets, daily meal and workout suggestions, habit tracking, 10 AI Coach messages and 5 AI photo food scans a day, and barcode lookups with no daily cap.",
  },
  {
    question: "When will NutriAI Pro be available?",
    answer: `Pro is planned at $${pro.priceUsdMonthly} a month or $${pro.priceUsdAnnual} a year, with a ${pro.annualTrialDays}-day free trial on the annual plan. It is not on sale yet. Checkout opens once payments are live; everything in the Free plan is available today.`,
  },
  {
    question: "What does Pro add?",
    answer: `Much higher daily AI limits: up to ${pro.limits.coachMessagesPerDay} AI Coach messages, ${pro.limits.scansPerDay} photo food scans, ${pro.limits.mealTextPerDay} text meal analyses and ${pro.limits.planGenerationsPerDay} AI workout plans a day. Every Free feature stays included.`,
  },
  {
    question: "Why are there daily limits at all?",
    answer:
      "Every AI Coach reply and photo scan is processed by a paid AI model. Daily fair-use limits keep the Free plan free and keep Pro affordable. Limits reset on a rolling 24-hour window.",
  },
  {
    question: "Can I cancel Pro?",
    answer:
      "Yes. When Pro launches you will be able to cancel at any time and keep Pro until the end of the period you paid for. Purchases made in the Android app are managed through your Google Play subscriptions.",
  },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "NutriAI Pricing: Free AI Meal Planner & Calorie Tracker",
      description: `Start free with NutriAI: meal plans, calorie targets, an AI coach and food scans, no credit card. Pro ($${pro.priceUsdMonthly}/month or $${pro.priceUsdAnnual}/year) is planned.`,
      path: "/pricing",
      jsonLd: [
        // No Pro Offer in structured data until Pro can actually be bought:
        // search engines treat an Offer as something on sale now.
        softwareApplicationSchema(),
        breadcrumbSchema(crumbs),
        faqPageSchema(PRICING_FAQS),
      ],
    }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-10">
          <Breadcrumbs crumbs={crumbs} />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pricing</p>
          <h1 className="mt-3 text-balance font-display text-5xl sm:text-6xl">
            Simple, honest pricing.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start free with everything you need. Pro, coming soon, raises your daily AI limits for
            coaching, photo scans and workout plans.
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
            price={`$${pro.priceUsdMonthly}`}
            tagline={`per month, or $${pro.priceUsdAnnual} a year ($${proMonthlyFromAnnual}/mo, save ${annualSavingPct}%)`}
            features={pro.features}
            cta={<span>Not yet available</span>}
          />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pro isn&apos;t on sale yet. Checkout opens once payments are live. Everything listed under
          Free is available today. Prices are in US dollars; local prices may apply in some
          countries.
        </p>

        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="font-display text-3xl">Pricing questions</h2>
          <div className="mt-6">
            <FaqList faqs={PRICING_FAQS} />
          </div>
        </section>
      </div>
    </PublicLayout>
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
