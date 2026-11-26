import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES, type FeatureContent } from "@/content/marketing";
import {
  breadcrumbSchema,
  faqPageSchema,
  pageHead,
  softwareApplicationSchema,
  type Crumb,
} from "@/lib/seo";
import { FaqList, PageIntro, PublicLayout } from "./PublicLayout";

function crumbsFor(feature: FeatureContent): Crumb[] {
  return [
    { name: "Home", path: "/" },
    { name: "Features", path: "/features" },
    { name: feature.navLabel, path: feature.path },
  ];
}

export function featureHead(feature: FeatureContent) {
  return pageHead({
    title: feature.title,
    description: feature.description,
    path: feature.path,
    jsonLd: [
      softwareApplicationSchema(),
      breadcrumbSchema(crumbsFor(feature)),
      faqPageSchema(feature.faqs),
    ],
  });
}

/** Keyword-focused landing page for one NutriAI feature. One H1, clear H2s. */
export function FeaturePage({ feature }: { feature: FeatureContent }) {
  const related = FEATURES.filter((f) => f.slug !== feature.slug);
  return (
    <PublicLayout>
      <PageIntro
        eyebrow={feature.eyebrow}
        title={feature.h1}
        summary={feature.summary}
        crumbs={crumbsFor(feature)}
      />

      <section className="landing-section border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-10">
            {feature.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="font-display text-2xl sm:text-3xl">{section.heading}</h2>
                <p className="mt-3 leading-7 text-muted-foreground">{section.body}</p>
              </div>
            ))}
          </div>
          <aside className="h-fit rounded-[2rem] border border-border/70 bg-card/70 p-7">
            <h2 className="font-display text-xl">What you get</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" className="mt-7 w-full rounded-full">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Free plan. No credit card required.
            </p>
          </aside>
        </div>
      </section>

      <section className="landing-section border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="font-display text-3xl">Frequently asked questions</h2>
          <div className="mt-8">
            <FaqList faqs={feature.faqs} />
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-2xl">More NutriAI features</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((f) => (
              <li key={f.slug}>
                <Link
                  to={f.path}
                  className="premium-card-hover block h-full rounded-2xl border border-border/70 bg-card/60 p-5"
                >
                  <span className="font-semibold text-foreground">{f.navLabel}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{f.eyebrow}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PublicLayout>
  );
}
