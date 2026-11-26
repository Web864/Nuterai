import { createFileRoute, Link } from "@tanstack/react-router";
import { PageIntro, PublicLayout } from "@/components/site/PublicLayout";
import { breadcrumbSchema, pageHead } from "@/lib/seo";
import { canonicalUrl } from "@/lib/site";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About NutriAI: Personal AI Nutrition Coaching for Everyone",
      description:
        "Why we built NutriAI, an AI meal planner and fitness coach grounded in nutrition science and made for real food and real schedules, desi kitchens included.",
      path: "/about",
      jsonLd: [
        breadcrumbSchema(crumbs),
        {
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About NutriAI",
          url: canonicalUrl("/about"),
          about: { "@type": "Organization", name: "NutriAI", founder: "Rabia Naz" },
        },
      ],
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicLayout>
      <PageIntro
        eyebrow="About"
        title="Smarter health, made personal."
        summary="NutriAI is an AI nutrition and fitness app that starts with you: your body, your goals, your culture and your schedule. It was built by Rabia Naz to make personal coaching affordable for everyone."
        crumbs={crumbs}
      />
      <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8">
        <div className="max-w-3xl text-foreground">
          <h2 className="font-display text-3xl sm:text-4xl">Why NutriAI exists</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Most health apps hand out one-size-fits-all plans and hope for the best. NutriAI is
            different: it starts with you and builds a plan that fits your life, including the food
            you grew up with.
          </p>
          <h2 className="mt-12 font-display text-3xl sm:text-4xl">How the guidance is grounded</h2>
          <p className="mt-4 text-muted-foreground">
            NutriAI combines established nutrition science (the Mifflin-St Jeor equation for energy
            needs, protein targets by goal and standard macro ranges) with adaptive AI that learns
            from your logs. Nothing here is medical advice: we&apos;re your coach, not your doctor.
            AI estimates are shown for you to review, and the coach has safety limits built in.
          </p>
          <h2 className="mt-12 font-display text-3xl sm:text-4xl">
            Why &quot;Fresh &amp; Organic&quot;
          </h2>
          <p className="mt-4 text-muted-foreground">
            Health apps shouldn&apos;t feel clinical or intimidating. Our design leans into the
            warmth of real food: the greens of fresh produce, the cream of a linen tablecloth.
            Because health is human, not a spreadsheet.
          </p>
          <p className="mt-10 text-muted-foreground">
            Want the details? Read{" "}
            <Link to="/how-it-works" className="text-primary hover:underline">
              how NutriAI works
            </Link>{" "}
            or browse the{" "}
            <Link to="/faq" className="text-primary hover:underline">
              FAQ
            </Link>
            .
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
