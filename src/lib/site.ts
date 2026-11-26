// Public origin used for canonical URLs and absolute social-preview images.
// Crawlers and link-preview bots need absolute URLs; relative og:image values
// are ignored by several of them. Update this when a custom domain goes live.
export const SITE_ORIGIN = "https://nutriai-cyan.vercel.app";

export function canonicalUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}
