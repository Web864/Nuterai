import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { FaqList, PageIntro, PublicLayout } from "@/components/site/PublicLayout";
import { FEATURES, GENERAL_FAQS } from "@/content/marketing";
import { breadcrumbSchema, faqPageSchema, pageHead, softwareApplicationSchema } from "@/lib/seo";
import { canonicalUrl } from "@/lib/site";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Features", path: "/features" },
];
const faqs = GENERAL_FAQS.slice(2, 6);

export const Route = createFileRoute("/features/")({
  head: () =>
    pageHead({
      title: "Features: AI Meal Planner, Calorie Tracker & Coach | NutriAI",
      description:
        "Explore NutriAI: an AI meal planner, photo and barcode calorie tracker, AI nutrition coach, workout planner and desi food tracking in one free app.",
      path: "/features",
      jsonLd: [
        softwareApplicationSchema(),
        breadcrumbSchema(crumbs),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: FEATURES.map((f, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: f.navLabel,
            url: canonicalUrl(f.path),
          })),
        },
        faqPageSchema(faqs),
      ],
    }),
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <PublicLayout>
      <PageIntro
        eyebrow="Features"
        title="Everything you need to eat well and stay active, in one AI app"
        summary="NutriAI brings meal planning, calorie and macro tracking, an AI coach and workout planning together, so each part knows about the others. Start free and use as much or as little as you like."
        crumbs={crumbs}
      />
      <section className="landing-section border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 sm:px-8 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <article
              key={feature.slug}
              className="premium-card-hover flex flex-col rounded-[2rem] border border-border/70 bg-card/70 p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                {feature.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-2xl">{feature.h1}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                {feature.summary}
              </p>
              <Link
                to={feature.path}
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Learn about the {feature.navLabel} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="font-display text-3xl">Feature questions</h2>
          <div className="mt-8">
            <FaqList faqs={faqs} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            More answers on the{" "}
            <Link to="/faq" className="text-primary hover:underline">
              FAQ page
            </Link>
            .
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
