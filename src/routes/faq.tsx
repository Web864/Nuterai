import { createFileRoute, Link } from "@tanstack/react-router";
import { FaqList, PageIntro, PublicLayout } from "@/components/site/PublicLayout";
import { FEATURES, GENERAL_FAQS } from "@/content/marketing";
import { breadcrumbSchema, faqPageSchema, pageHead } from "@/lib/seo";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "FAQ", path: "/faq" },
];

// Every question on this page, general plus per-feature, so the FAQPage
// schema matches exactly what is visible.
const featureFaqs = FEATURES.map((f) => ({ feature: f, faqs: f.faqs }));
const allFaqs = [...GENERAL_FAQS, ...featureFaqs.flatMap((g) => g.faqs)];

export const Route = createFileRoute("/faq")({
  head: () =>
    pageHead({
      title: "NutriAI FAQ: AI Meal Planner, Calorie Tracker & Privacy",
      description:
        "Answers about NutriAI: pricing, how the AI meal planner and photo calorie counter work, desi food support, workouts, accuracy and data privacy.",
      path: "/faq",
      jsonLd: [breadcrumbSchema(crumbs), faqPageSchema(allFaqs)],
    }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PublicLayout>
      <PageIntro
        eyebrow="FAQ"
        title="Frequently asked questions about NutriAI"
        summary="Quick answers about what NutriAI does, what it costs, how accurate the AI estimates are and how your data is handled. Can't find your question? Email support@nutriai.app."
        crumbs={crumbs}
      />
      <section className="landing-section border-b border-border/60">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="font-display text-3xl">General</h2>
          <div className="mt-6">
            <FaqList faqs={GENERAL_FAQS} />
          </div>
          {featureFaqs.map(({ feature, faqs }) => (
            <div key={feature.slug} className="mt-14">
              <h2 className="font-display text-3xl">
                <Link to={feature.path} className="hover:text-primary">
                  {feature.eyebrow}
                </Link>
              </h2>
              <div className="mt-6">
                <FaqList faqs={faqs} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
