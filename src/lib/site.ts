// Public origin used for canonical URLs, the sitemap, llms.txt and absolute
// social-preview images. Crawlers and link-preview bots need absolute URLs;
// relative og:image values are ignored by several of them.
//
// Host-neutral: set VITE_SITE_URL (e.g. https://nutriai.app) at build time on
// whichever host serves the site. The fallback is the current production URL.
const configuredOrigin =
  typeof import.meta !== "undefined" ? (import.meta.env?.VITE_SITE_URL as string | undefined) : "";

export const SITE_ORIGIN = (configuredOrigin || "https://nutriai-cyan.vercel.app").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "NutriAI";

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}
