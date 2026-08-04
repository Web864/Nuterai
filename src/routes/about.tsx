import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About NutriAI — Our mission for smarter health" },
      {
        name: "description",
        content:
          "NutriAI is on a mission to make personalized health coaching accessible to everyone.",
      },
      { property: "og:title", content: "About NutriAI" },
      {
        property: "og:description",
        content: "Our mission for smarter, more personal health coaching.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-accent">About</p>
        <h1 className="mt-2 font-display text-5xl">Smarter health, made personal.</h1>
        <div className="prose prose-lg mt-8 max-w-none text-foreground">
          <p className="text-lg text-muted-foreground">
            Most health apps hand out one-size-fits-all plans and hope for the best. NutriAI is
            different: it starts with you — your body, your goals, your culture, your schedule — and
            builds a plan that fits your life.
          </p>
          <p className="mt-6 text-muted-foreground">
            Under the hood, NutriAI combines evidence-based nutrition science (Mifflin–St Jeor for
            metabolism, protein targets by goal, macro distributions from real research) with
            adaptive AI that learns from your progress. Nothing here is medical advice — we're your
            coach, not your doctor. But the guidance we give is grounded, safe, and personal.
          </p>
          <h2 className="mt-10 font-display text-3xl">Why "Fresh & Organic"</h2>
          <p className="mt-4 text-muted-foreground">
            Health apps shouldn't feel clinical or intimidating. Our design leans into the warmth of
            real food — the greens of fresh produce, the cream of a linen tablecloth. Because health
            is human, not a spreadsheet.
          </p>
        </div>
      </div>
    </div>
  );
}
