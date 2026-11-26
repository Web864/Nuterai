/**
 * The list of public, indexable pages. Single source for sitemap.xml and
 * llms.txt so a new marketing page only has to be added once.
 */
import { FEATURES } from "@/content/marketing";

export interface PublicPage {
  path: string;
  title: string;
  summary: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: string;
}

export const PUBLIC_PAGES: PublicPage[] = [
  {
    path: "/",
    title: "NutriAI home",
    summary: "AI meal planner, calorie tracker and fitness coach for the food you actually eat.",
    changefreq: "weekly",
    priority: "1.0",
  },
  {
    path: "/features",
    title: "Features",
    summary: "Overview of every NutriAI feature.",
    changefreq: "monthly",
    priority: "0.9",
  },
  ...FEATURES.map((f): PublicPage => ({
    path: f.path,
    title: f.navLabel,
    summary: f.summary,
    changefreq: "monthly",
    priority: "0.9",
  })),
  {
    path: "/how-it-works",
    title: "How it works",
    summary: "The five steps from onboarding to an adaptive plan.",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/pricing",
    title: "Pricing",
    summary: "Free plan details and the upcoming Pro plan.",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/faq",
    title: "FAQ",
    summary: "Answers about pricing, accuracy, desi food support and privacy.",
    changefreq: "monthly",
    priority: "0.8",
  },
  {
    path: "/about",
    title: "About",
    summary: "Why NutriAI exists and how its guidance is grounded.",
    changefreq: "monthly",
    priority: "0.6",
  },
  {
    path: "/privacy",
    title: "Privacy policy",
    summary: "How NutriAI handles personal data.",
    changefreq: "yearly",
    priority: "0.3",
  },
  {
    path: "/terms",
    title: "Terms of service",
    summary: "Terms of use and general wellness disclaimer.",
    changefreq: "yearly",
    priority: "0.3",
  },
];

/**
 * Logged-in and auth routes. Disallowed in robots.txt and noindexed in their
 * route heads. Paths are matched as prefixes by crawlers, so public pages
 * must never start with one of these (that is why the workout planner page
 * lives at /features/ai-workout-planner, not /workout-planner).
 */
export const PRIVATE_PATH_PREFIXES = [
  "/auth",
  "/dashboard",
  "/onboarding",
  "/log",
  "/workout",
  "/coach",
  "/scan",
  "/recipes",
  "/reminders",
  "/community",
  "/achievements",
  "/settings",
  "/admin",
  "/u/",
];
