import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_PAGES } from "@/lib/public-pages";
import { CONTENT_UPDATED } from "@/lib/seo";
import { canonicalUrl } from "@/lib/site";

export function sitemapXml(): string {
  const urls = PUBLIC_PAGES.map(
    (page) =>
      `  <url>\n    <loc>${canonicalUrl(page.path)}</loc>\n    <lastmod>${CONTENT_UPDATED}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(sitemapXml(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
