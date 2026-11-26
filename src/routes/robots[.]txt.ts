import { createFileRoute } from "@tanstack/react-router";
import { PRIVATE_PATH_PREFIXES } from "@/lib/public-pages";
import { SITE_ORIGIN } from "@/lib/site";

/**
 * Served dynamically so the sitemap reference is an absolute URL (search
 * engines reject relative sitemap paths). AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot, Google-Extended...) are covered by the wildcard group and
 * allowed on public pages on purpose: being readable by them is what makes
 * NutriAI citable in AI answers (GEO).
 */
export function robotsTxt(origin: string = SITE_ORIGIN): string {
  return [
    "User-agent: *",
    "Allow: /",
    ...PRIVATE_PATH_PREFIXES.map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(robotsTxt(), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
