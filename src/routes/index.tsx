import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-food.jpg";
import howItWorksCta from "@/assets/how-it-works-cta.png";
import Image from "@/assets/image.png";
import cta1 from "@/assets/cta1.png";
import cta2 from "@/assets/cta2.png";
import {
  Activity,
  ArrowRight,
  BarChart3,
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
      { title: "NutriAI - AI Meal Plans, Workouts & Habit Tracking" },
      {
        name: "description",
        content:
          "Get an AI nutrition and fitness plan built around your body, goals, and schedule - meal plans, adaptive workouts, food scanning, and habit tracking, free.",
      },
      { property: "og:title", content: "NutriAI - AI Meal Plans, Workouts & Habit Tracking" },
      {
        property: "og:description",
        content:
          "An AI health coach that builds your meals and workouts, scans your food, and adapts as your week changes. Free to start.",
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

const features = [
  {
    icon: Utensils,
    title: "AI meal plans",
    description: "Personalized meals for your diet, budget, allergies, and culture.",
    visual: "meal",
  },
  {
    icon: Dumbbell,
    title: "Adaptive workouts",
    description: "Gym, home, or no-equipment sessions that adapt to your week.",
    visual: "workout",
  },
  {
    icon: Brain,
    title: "Smart AI coach",
    description: "Natural answers and timely adjustments when your day changes.",
    visual: "coach",
  },
  {
    icon: ScanLine,
    title: "Snap to log",
    description: "Photo or barcode logging with calorie and macro estimates.",
    visual: "scan",
  },
  {
    icon: MoonStar,
    title: "Sleep & recovery",
    description: "Bring recovery into tomorrow's movement plan.",
    visual: "sleep",
  },
  {
    icon: Heart,
    title: "Habits & mood",
    description: "See the patterns connecting food, movement, and how you feel.",
    visual: "habits",
  },
];

function LandingPage() {
  return (
    <div className="landing-page premium-shell min-h-screen">
      <SiteHeader />
      <main>
        <section className="landing-hero relative isolate overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 -z-10 bg-gradient-glow" />
          <div className="landing-hero-grid mx-auto grid max-w-7xl lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="landing-hero-copy max-w-xl">
              <span className="premium-glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Your personal AI health coach
              </span>
              <h1 className="landing-hero-title mt-6 text-balance font-display">
                Eat well.
                <br />
                Move often.
                <br />
                <span className="emerald-text">Live better.</span>
              </h1>
              <p className="landing-hero-description mt-6 max-w-lg text-muted-foreground">
                NutriAI builds a nutrition, fitness, and lifestyle plan around your body, your
                goals, and your day - then adapts it as you go.
              </p>
              <div className="landing-hero-actions mt-8 flex">
                <Button asChild size="lg" className="landing-primary-action rounded-full px-7">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="landing-secondary-action rounded-full px-7">
                  <Link to="/auth">I already have an account</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Free forever. No credit card required.
              </p>
              <div className="landing-trust-grid mt-9 grid max-w-md border-t border-border/60 pt-6">
                <TrustPoint icon={Sparkles} label="Personalized" detail="Plans" />
                <TrustPoint icon={Brain} label="AI-powered" detail="Insights" />
                <TrustPoint icon={BarChart3} label="Real" detail="Results" />
              </div>
            </div>

            <div className="landing-preview premium-float relative mx-auto w-full max-w-2xl lg:max-w-none">
              <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-primary/20 blur-3xl" />
              <div className="landing-preview-frame relative overflow-hidden border border-white/15 shadow-hero">
                <img
                  src={heroImage}
                  alt="A wholesome salmon grain bowl with fresh greens, tomatoes, avocado, and seeds"
                  width={1600}
                  height={1200}
                  fetchPriority="high"
                  decoding="async"
                  className="landing-preview-image w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-background/75 to-transparent" />
              </div>
              <div className="landing-overlay landing-analysis premium-glass absolute rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Activity className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">AI analysis</p>
                    <p className="text-xs text-muted-foreground">Balanced meal</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <Metric label="Protein" value="32g" tone="bg-primary" />
                  <Metric label="Carbs" value="48g" tone="bg-sky-400" />
                  <Metric label="Fats" value="18g" tone="bg-amber-400" />
                </div>
              </div>
              <div className="landing-overlay landing-calories premium-glass absolute flex items-center gap-3 rounded-2xl">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Leaf className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-lg font-semibold leading-none">520 kcal</p>
                  <p className="mt-1 text-xs text-muted-foreground">Balanced meal</p>
                </div>
              </div>
              <div className="landing-overlay landing-message premium-glass absolute rounded-2xl">
                <div className="flex items-start gap-2">
                  <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-5 text-foreground">
                    Smarter food choices for a healthier you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border/60 bg-background/25 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <SectionHeading
              eyebrow="One app. Everything."
              title={
                <>
                  Health that fits <span className="emerald-text">your life.</span>
                </>
              }
              description="No generic plans. No calorie guessing. Just a coach that understands your body, your goals, and the way you actually live."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading eyebrow="How it works" title="Three steps to a healthier you." />
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <JourneyStep
                number="1"
                icon={Leaf}
                title="Tell us about you"
                description="Two minutes on your body, goals, and lifestyle. Nothing invasive."
                backgroundPosition="-82px -86px"
              />
              <JourneyStep
                number="2"
                icon={ChefHat}
                title="Get your plan"
                description="AI builds calorie targets, meals, and workouts personalized to you."
                backgroundPosition="-376px -89px"
              />
              <JourneyStep
                number="3"
                icon={Heart}
                title="Live better"
                description="Log, learn, and let NutriAI adapt your plan as your life changes."
                backgroundPosition="-675px -86px"
              />
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
          <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-primary/35 bg-gradient-hero px-6 py-12 shadow-hero sm:rounded-[2.5rem] sm:px-12 md:grid-cols-[1fr_1.4fr_1fr] md:items-center md:py-14">
            <div
              aria-hidden="true"
              className="reference-art absolute inset-0 opacity-95"
              style={{
                backgroundImage: "url(" + cta1 + ")",
                backgroundSize: "cover",
              }}
            />
            <div
              aria-hidden="true"
              className="reference-art absolute inset-y-0 right-0 w-1/2 opacity-90"
              style={{
                backgroundImage: "url(" + cta2 + ")",
                backgroundSize: "cover",
              }}
            />
            <div className="relative z-10 col-start-2 mx-auto max-w-xl text-center">
              <h2 className="text-balance font-display text-4xl text-foreground sm:text-5xl">
                Ready to feel your best?
              </h2>
              <p className="mt-3 text-sm text-primary sm:text-base">
                Start your personalized plan in under two minutes. Free forever.
              </p>
              <Button asChild size="lg" className="premium-shimmer mt-7 rounded-full px-8">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create my plan <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="landing-header sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="landing-header-inner mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_22px_oklch(0.77_0.18_153_/_0.3)]">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-lg">NutriAI</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="landing-header-actions flex items-center">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-4">
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
    <footer className="border-t border-border/60 bg-background/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-9 text-sm text-muted-foreground sm:flex-row sm:px-8 lg:px-10">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-foreground">NutriAI</span>
          <span>Copyright {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
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

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance font-display text-4xl leading-tight sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 leading-7 text-muted-foreground">{description}</p>}
    </div>
  );
}

function TrustPoint({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof Sparkles;
  label: string;
  detail: string;
}) {
  return (
    <div className="landing-trust-item flex items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs leading-4 text-muted-foreground">
        <span className="block font-semibold text-foreground">{label}</span>
        {detail}
      </p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-muted-foreground">
        <i className={`h-2 w-2 rounded-full ${tone}`} />
        {label}
      </span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function JourneyStep({
  number,
  icon: Icon,
  title,
  description,
  backgroundPosition,
}: {
  number: string;
  icon: typeof Leaf;
  title: string;
  description: string;
  backgroundPosition: string;
}) {
  return (
    <div>
      <div
        role="img"
        aria-label={title + " NutriAI app screen"}
        className="reference-art mx-auto h-[225px] w-[178px]"
        style={{ backgroundImage: "url(" + howItWorksCta + ")", backgroundPosition }}
      />
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">Step {number}</span>
      </div>
      <h3 className="mt-3 font-display text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
function FeatureCard({
  icon: Icon,
  title,
  description,
  visual,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  visual: string;
}) {
  const visualContent =
    visual === "meal" || visual === "scan" ? (
      <img src={heroImage} alt="" className="h-16 w-16 rounded-full object-cover" />
    ) : (
      <Icon className="h-9 w-9 text-primary" />
    );
  return (
    <div className="premium-card-hover relative min-h-[176px] overflow-hidden rounded-2xl border border-border/70 bg-gradient-card p-5 sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_26px_oklch(0.77_0.18_153_/_0.22)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center">
        {visualContent}
      </span>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <p className="mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
