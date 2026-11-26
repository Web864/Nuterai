import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneMockup, type PhoneMockupScreen } from "@/components/landing/PhoneMockup";
import { PageIntro, PublicLayout } from "@/components/site/PublicLayout";
import { HOW_IT_WORKS_STEPS } from "@/content/marketing";
import { breadcrumbSchema, howToSchema, pageHead } from "@/lib/seo";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "How it works", path: "/how-it-works" },
];
const SCREENS: (PhoneMockupScreen | null)[] = ["onboarding", "plan", null, null, "progress"];

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How NutriAI Works: AI Meal Plans & Tracking in 5 Steps",
      description:
        "See how NutriAI turns a two-minute onboarding into calorie targets, AI meal plans, photo food logging, workouts and coaching that adapt with you.",
      path: "/how-it-works",
      jsonLd: [
        breadcrumbSchema(crumbs),
        howToSchema({
          name: "How to start a personalized nutrition plan with NutriAI",
          description:
            "Set up NutriAI, get calorie and macro targets, and log meals with AI in five steps.",
          steps: HOW_IT_WORKS_STEPS,
        }),
      ],
    }),
  component: HowItWorksPage,
});

function HowItWorksPage() {
  return (
    <PublicLayout>
      <PageIntro
        eyebrow="How it works"
        title="From two minutes of questions to a plan that adapts with you"
        summary="NutriAI works in five steps: tell it about yourself, get personal calorie and macro targets with an AI meal plan, log food by photo, barcode or text, train with an AI workout plan, and adjust as your life changes."
        crumbs={crumbs}
      />
      <section className="landing-section border-b border-border/60">
        <ol className="mx-auto max-w-5xl space-y-14 px-5 sm:px-8">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const screen = SCREENS[index];
            return (
              <li
                key={step.name}
                className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_220px]"
              >
                <div>
                  <p className="text-sm font-medium text-primary">Step {index + 1}</p>
                  <h2 className="mt-2 font-display text-2xl sm:text-3xl">{step.name}</h2>
                  <p className="mt-3 max-w-xl leading-7 text-muted-foreground">{step.text}</p>
                </div>
                {screen && (
                  <div aria-hidden="true" className="hidden md:block">
                    <PhoneMockup screen={screen} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
      <section className="landing-section">
        <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
          <h2 className="font-display text-3xl sm:text-4xl">Ready to try it?</h2>
          <p className="mt-3 text-muted-foreground">
            Setup takes about two minutes. The Free plan needs no credit card.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create my free plan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link to="/features">Explore features</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
