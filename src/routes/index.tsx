import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PhoneMockup, type PhoneMockupScreen } from "@/components/landing/PhoneMockup";
import { useSession } from "@/features/auth/use-session";
import heroImage from "@/assets/hero-food.jpg";
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
import { FaqList, PublicLayout } from "@/components/site/PublicLayout";
import { GENERAL_FAQS } from "@/content/marketing";
import { PLANS } from "@/lib/billing/plans";
import { faqPageSchema, pageHead, softwareApplicationSchema } from "@/lib/seo";
import { clearSessionHint } from "@/lib/session-hint";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      title: "NutriAI: AI Meal Planner, Calorie Tracker & Fitness Coach",
      description:
        "Free AI nutrition app: personalized meal plans, photo and barcode calorie tracking, an AI coach and workouts. Built for the food you eat, desi meals included.",
      path: "/",
      jsonLd: [
        softwareApplicationSchema({ proPrice: String(PLANS.pro.priceUsdMonthly) }),
        faqPageSchema(HOME_FAQS),
      ],
    }),
  component: LandingPage,
});

const HOME_FAQS = GENERAL_FAQS.slice(0, 6);

const features = [
  {
    icon: Utensils,
    title: "AI meal plans",
    href: "/features/ai-meal-planner",
    description: "Personalized meals for your diet, budget, allergies, and culture.",
    visual: "meal",
  },
  {
    icon: Dumbbell,
    title: "Adaptive workouts",
    href: "/features/ai-workout-planner",
    description: "Gym, home, or no-equipment sessions that adapt to your week.",
    visual: "workout",
  },
  {
    icon: Brain,
    title: "Smart AI coach",
    href: "/features/ai-nutrition-coach",
    description: "Natural answers and timely adjustments when your day changes.",
    visual: "coach",
  },
  {
    icon: ScanLine,
    title: "Snap to log",
    href: "/features/ai-calorie-tracker",
    description: "Photo or barcode logging with calorie and macro estimates.",
    visual: "scan",
  },
  {
    icon: MoonStar,
    title: "Sleep & recovery",
    href: "/features",
    description: "Bring recovery into tomorrow's movement plan.",
    visual: "sleep",
  },
  {
    icon: Heart,
    title: "Habits & mood",
    href: "/features",
    description: "See the patterns connecting food, movement, and how you feel.",
    visual: "habits",
  },
];

function LandingPage() {
  const session = useSession();
  const navigate = useNavigate();

  // Always server-render the full page: crawlers have no session, and an
  // empty "loading" shell here used to make the homepage invisible to search
  // engines. Signed-in visitors are hidden pre-paint by the session hint
  // (src/lib/session-hint.ts) and redirected once the session resolves.
  useEffect(() => {
    if (session.data) {
      void navigate({ to: "/dashboard", replace: true });
    } else if (!session.isPending) {
      clearSessionHint();
    }
  }, [navigate, session.data, session.isPending]);

  return (
    <div className="landing-session-gate">
      <PublicLayout>
        <section className="landing-hero relative isolate overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 -z-10 bg-gradient-glow" />
          <div className="landing-hero-grid mx-auto grid max-w-7xl lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="landing-hero-copy max-w-xl">
              <span className="premium-glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Meal plans, calorie tracking and an AI coach
              </span>
              <h1 className="landing-hero-title mt-6 text-balance font-display">
                The AI meal planner for the food you actually{" "}
                <span className="emerald-text">love.</span>
              </h1>
              <p className="landing-hero-description mt-6 max-w-lg text-muted-foreground">
                NutriAI builds personalized meal plans around your goals, budget, allergies and
                favourite foods, counts calories from a photo, and adapts workouts to your week.
                Desi meals included.
              </p>
              <div className="landing-hero-actions mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="landing-primary-action rounded-full px-7">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create my free plan <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="landing-secondary-action rounded-full px-7"
                >
                  <Link to="/how-it-works">See how it works</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Free forever. No credit card required.
              </p>
              <div className="landing-trust-grid mt-9 grid max-w-md min-w-0 border-t border-border/60 pt-6">
                <TrustPoint icon={Sparkles} label="Personalized" detail="Plans" />
                <TrustPoint icon={Brain} label="AI-powered" detail="Insights" />
                <TrustPoint icon={BarChart3} label="Progress" detail="Tracking" />
              </div>
            </div>

            <div className="landing-preview relative mx-auto w-full max-w-2xl lg:max-w-none">
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
                    <p className="text-sm font-semibold">Example analysis</p>
                    <p className="text-xs text-muted-foreground">Balanced meal</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <Metric label="Protein" value="32g" tone="bg-[var(--nutrient-protein)]" />
                  <Metric label="Carbs" value="48g" tone="bg-[var(--nutrient-carbs)]" />
                  <Metric label="Fats" value="18g" tone="bg-[var(--nutrient-fat)]" />
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
              <p className="landing-example-label">Illustrative meal. Example estimates.</p>
            </div>
          </div>
        </section>

        <section className="landing-section border-b border-border/60 bg-background/25">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <SectionHeading
              eyebrow="A simpler nutrition routine"
              title={
                <>
                  A plan, a log, and a better <span className="emerald-text">next meal.</span>
                </>
              }
              description="NutriAI keeps the daily loop focused: plan meals around your life, track what you ate, then make the next choice easier."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section border-b border-border/60 bg-background/20">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
            <div>
              <SectionHeading
                eyebrow="Made for familiar food"
                title={
                  <>
                    Plan around <span className="emerald-text">your table.</span>
                  </>
                }
                description="Plan around your preferences, budget, allergies, and familiar foods. Log meals in everyday portions where available, then review the nutrition estimate before saving."
              />
            </div>
            <div className="landing-food-grid grid gap-3">
              {[
                "Roti",
                "Paratha",
                "Biryani",
                "Daal chawal",
                "Chicken karahi",
                "Chana",
                "Tikka",
                "Raita",
                "Doodh patti",
              ].map((food) => (
                <div
                  key={food}
                  className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium text-foreground"
                >
                  {food}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-safety-section border-b border-border/60">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <SectionHeading
              eyebrow="Built for responsible guidance"
              title="Useful nutrition support, with you in control."
              description="Nutrition targets support general wellness. AI estimates are not exact measurements: review and edit your plans and food records. NutriAI does not diagnose or treat medical conditions."
            />
          </div>
        </section>

        <section id="how-it-works" className="landing-section border-t border-border/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <SectionHeading eyebrow="How it works" title="A better next meal, in three steps." />
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              <JourneyStep
                number="1"
                icon={Leaf}
                title="Tell us about you"
                description="Two minutes on your body, goals, and lifestyle. Nothing invasive."
                screen="onboarding"
              />
              <JourneyStep
                number="2"
                icon={ChefHat}
                title="Get your plan"
                description="NutriAI builds calorie targets and meal guidance around your goals and preferences."
                screen="plan"
              />
              <JourneyStep
                number="3"
                icon={Heart}
                title="Live better"
                description="Log, learn, and let NutriAI adapt your plan as your life changes."
                screen="progress"
              />
            </div>
          </div>
        </section>

        <section className="landing-section border-b border-border/60">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <SectionHeading
              eyebrow="FAQ"
              title="Questions people ask about NutriAI"
              description="Straight answers about cost, accuracy and what NutriAI can and can't do."
            />
            <div className="mt-10">
              <FaqList faqs={HOME_FAQS} />
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/faq" className="text-primary hover:underline">
                See all questions
              </Link>{" "}
              or{" "}
              <Link to="/features" className="text-primary hover:underline">
                explore every feature
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="landing-final-cta px-5 pb-12 sm:px-8 sm:pb-20 lg:px-10">
          <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-primary/35 bg-gradient-hero px-6 py-12 shadow-hero sm:rounded-[2.5rem] sm:px-12 md:grid-cols-[minmax(0,1fr)_220px] md:items-center md:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-12 top-0 size-64 rounded-full bg-primary/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-12 right-10 hidden rotate-6 md:block"
            >
              <PhoneMockup screen="plan" />
            </div>
            <div className="relative z-10 mx-auto min-w-0 max-w-xl text-center md:mx-0 md:text-left">
              <h2 className="text-balance font-display text-4xl text-foreground sm:text-5xl">
                Ready to feel your best?
              </h2>
              <p className="mt-3 text-sm text-primary sm:text-base">
                Start your personalized plan in under two minutes. Free forever.
              </p>
              <Button asChild size="lg" className="mt-7 rounded-full px-8">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Create my plan <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </PublicLayout>
    </div>
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
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 className="landing-section-heading mt-3 text-balance font-display">{title}</h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
      )}
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
  screen,
}: {
  number: string;
  icon: typeof Leaf;
  title: string;
  description: string;
  screen: PhoneMockupScreen;
}) {
  return (
    <div className="min-w-0">
      <PhoneMockup screen={screen} />
      <p className="mt-3 text-center text-xs text-muted-foreground">Illustrative product preview</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">Step {number}</span>
      </div>
      <h3 className="mt-3 font-display text-xl sm:text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
function FeatureCard({
  icon: Icon,
  title,
  description,
  visual,
  href,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  visual: string;
  href: string;
}) {
  const visualContent =
    visual === "meal" || visual === "scan" ? (
      <img src={heroImage} alt="" className="h-16 w-16 rounded-full object-cover" />
    ) : (
      <Icon className="h-9 w-9 text-primary" />
    );
  return (
    <div className="landing-feature-card premium-card-hover relative min-h-[176px] overflow-hidden rounded-2xl border border-border/70 bg-gradient-card p-5 sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_26px_oklch(0.77_0.18_153_/_0.22)]">
        <Icon className="h-5 w-5" />
      </span>
      <span
        aria-hidden="true"
        className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center opacity-40"
      >
        {visualContent}
      </span>
      <h3 className="mt-5 font-display text-2xl">
        <Link to={href} className="after:absolute after:inset-0 hover:text-primary">
          {title}
        </Link>
      </h3>
      <p className="mt-2 max-w-[16rem] text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
