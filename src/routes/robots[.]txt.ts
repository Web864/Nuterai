import { createFileRoute } from "@tanstack/react-router";

/**
 * Served dynamically so the sitemap reference is an absolute URL on whatever
 * domain the app is deployed to (search engines reject relative sitemap paths).
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /auth",
          "Disallow: /dashboard",
          "Disallow: /onboarding",
          "Disallow: /log",
          "Disallow: /workout",
          "Disallow: /coach",
          "Disallow: /scan",
          "Disallow: /reminders",
          "Disallow: /community",
          "Disallow: /achievements",
          "Disallow: /settings",
          "Disallow: /admin",
          "Disallow: /u/",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
          "",
        ].join("\n");

        return new Response(body, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
