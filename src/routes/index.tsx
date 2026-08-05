import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-food.jpg";
import {
  Apple,
  Brain,
  ChefHat,
  Dumbbell,
  Heart,
  Leaf,
  MoonStar,
  ScanLine,
  Sparkles,
  Utensils,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NutriAI — Your Personal AI Health & Lifestyle Coach" },
      {
        name: "description",
        content:
          "NutriAI adapts to your body, goals, and lifestyle to create the perfect nutrition, fitness, and wellness plan — powered by AI.",
      },
      { property: "og:title", content: "NutriAI — Your Personal AI Health & Lifestyle Coach" },
      {
        property: "og:description",
        content: "AI-powered nutrition, fitness, and lifestyle coaching that adapts to your day.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "NutriAI",
          applicationCategory: "HealthApplication",
          operatingSystem: "Web, iOS, Android",
          description:
            "AI-powered nutrition, fitness, and lifestyle coaching that adapts to your body, goals, and day.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-glow" />
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Your personal AI health coach
              </span>
              <h1 className="mt-6 font-display text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
                Eat well.
                <br />
                Move often.
                <br />
                <span className="text-primary">Live better.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                NutriAI builds a nutrition, fitness, and lifestyle plan around your body, your
                goals, and your day — and adapts it as you go.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get started free
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                  <Link to="/auth">I already have an account</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Free forever. No credit card required.
              </p>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-hero opacity-20 blur-3xl" />
              <img
                src={heroImage}
                alt="A bowl of fresh leafy greens with avocado, berries, salmon, and grains — a colorful plate representing personalized nutrition"
                width={1600}
                height={1200}
                fetchPriority="high"
                decoding="async"
                className="rounded-[2rem] shadow-hero"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border/60 bg-secondary/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">
                One app. Everything.
              </p>
              <h2 className="mt-3 font-display text-4xl text-foreground sm:text-5xl">
                Health that fits <em className="not-italic text-primary">your</em> life.
              </h2>
              <p className="mt-4 text-muted-foreground">
                No generic plans. No calorie guessing. Just a coach that understands your body, your
                goals, and the way you actually live.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Utensils className="h-5 w-5" />}
                title="AI meal plans"
                description="Personalized meals for your diet, budget, allergies, and culture — from Pakistani home cooking to keto lunches."
              />
              <FeatureCard
                icon={<Dumbbell className="h-5 w-5" />}
                title="Adaptive workouts"
                description="Gym, home, no-equipment. Plans that adjust to your energy, recovery, and progress."
              />
              <FeatureCard
                icon={<Brain className="h-5 w-5" />}
                title="Smart AI coach"
                description="Chat naturally. 'I only have eggs.' 'I'm fasting today.' Your plan adapts in seconds."
              />
              <FeatureCard
                icon={<ScanLine className="h-5 w-5" />}
                title="Snap to log"
                description="Photo or barcode. AI estimates calories and macros in one tap."
              />
              <FeatureCard
                icon={<MoonStar className="h-5 w-5" />}
                title="Sleep & recovery"
                description="Track sleep quality and let NutriAI adjust tomorrow's workout intensity."
              />
              <FeatureCard
                icon={<Heart className="h-5 w-5" />}
                title="Habits & mood"
                description="See how food, movement, and rest shape how you feel — day to day."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">
                How it works
              </p>
              <h2 className="mt-3 font-display text-4xl text-foreground sm:text-5xl">
                Three steps to a healthier you.
              </h2>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3">
              <Step number={1} title="Tell us about you" icon={<Leaf className="h-5 w-5" />}>
                Two minutes on your body, goals, and lifestyle. Nothing invasive.
              </Step>
              <Step number={2} title="Get your plan" icon={<ChefHat className="h-5 w-5" />}>
                AI builds calorie targets, meals, and workouts personalized to you.
              </Step>
              <Step number={3} title="Live better" icon={<Apple className="h-5 w-5" />}>
                Log, learn, and let NutriAI adapt your plan as your life changes.
              </Step>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="mx-auto max-w-4xl rounded-[2.5rem] bg-gradient-hero px-6 py-16 text-center text-primary-foreground shadow-hero sm:px-16">
            <h2 className="font-display text-4xl sm:text-5xl">Ready to feel your best?</h2>
            <p className="mx-auto mt-4 max-w-xl opacity-80">
              Start your personalized plan in under two minutes. Free forever.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8 rounded-full px-8">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create my plan
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg tracking-tight">NutriAI</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link to="/about" className="transition-organic hover:text-foreground">
            About
          </Link>
          <Link to="/pricing" className="transition-organic hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-3 w-3" />
          </span>
          <span className="font-display text-foreground">NutriAI</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft transition-organic hover:shadow-elevated">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-xl text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  icon,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent-foreground">
          {icon}
        </span>
        <span className="font-display text-sm text-muted-foreground">Step {number}</span>
      </div>
      <h3 className="mt-4 font-display text-2xl text-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{children}</p>
    </div>
  );
}
