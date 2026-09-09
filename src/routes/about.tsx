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
    <div className="premium-shell min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <Link to="/" className="mb-12 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" /> NutriAI
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">About</p>
        <h1 className="mt-3 text-balance font-display text-5xl leading-tight sm:text-6xl">Smarter health, made personal.</h1>
        <div className="mt-10 max-w-3xl border-t border-border/60 pt-8 text-foreground">
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
          <h2 className="mt-12 font-display text-3xl sm:text-4xl">Why "Fresh & Organic"</h2>
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
