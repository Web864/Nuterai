import { createFileRoute } from "@tanstack/react-router";
import { GENERAL_FAQS, WELLNESS_DISCLAIMER } from "@/content/marketing";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import { canonicalUrl } from "@/lib/site";

/**
 * /llms.txt (https://llmstxt.org): a plain-Markdown map of the site for AI
 * assistants and answer engines, built from the same content as the pages.
 */
export function llmsTxt(): string {
  const pages = PUBLIC_PAGES.map(
    (p) => `- [${p.title}](${canonicalUrl(p.path)}): ${p.summary}`,
  ).join("\n");
  const faqs = GENERAL_FAQS.map((f) => `### ${f.question}\n\n${f.answer}`).join("\n\n");
  return `# NutriAI

> NutriAI is an AI nutrition and fitness app: an AI meal planner, a photo, barcode and text calorie tracker, an AI nutrition coach and an AI workout planner, with first-class support for Pakistani and Indian (desi) food. It runs on the web and Android, and has a free plan.

${WELLNESS_DISCLAIMER}

## Pages

${pages}

## Key facts

- Free plan: calorie and macro targets, daily meal and workout suggestions, water, sleep, weight and mood tracking, 10 AI Coach messages and 5 AI photo food scans per day, barcode lookups with no daily cap.
- Pro plan (planned, not on sale yet): fair-use AI limits of 150 Coach messages, 60 photo scans and 20 workout plans per day.
- Calorie targets use the Mifflin-St Jeor equation; AI food estimates are approximate and editable.
- Workout plans support full gym, home gym, basic equipment and no equipment.

## FAQ

${faqs}
`;
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(llmsTxt(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
