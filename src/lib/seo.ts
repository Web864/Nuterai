/**
 * SEO / AEO / GEO helpers for public (indexable) pages.
 *
 * Every public route builds its <head> with `pageHead()` so each page gets a
 * unique title + description, a canonical URL, matching Open Graph / Twitter
 * tags and optional JSON-LD. Logged-in app routes are noindexed in
 * src/routes/_authenticated/route.tsx and must not use this helper.
 *
 * Copy rule: NutriAI is a general-wellness app. Keep titles, descriptions and
 * schema free of medical claims (no "treat", "cure", "diagnose", "clinically").
 */
import { canonicalUrl, SITE_NAME, SITE_ORIGIN } from "@/lib/site";

/** Bump when public page copy changes; used for sitemap <lastmod>. */
export const CONTENT_UPDATED = "2026-11-26";

export const DEFAULT_OG_IMAGE = "/og-image.jpg";

export interface Faq {
  question: string;
  answer: string;
}

export interface Crumb {
  name: string;
  path: string;
}

type JsonLd = Record<string, unknown>;

export function pageHead({
  title,
  description,
  path,
  ogType = "website",
  image = DEFAULT_OG_IMAGE,
  jsonLd = [],
}: {
  title: string;
  description: string;
  path: string;
  ogType?: "website" | "article";
  image?: string;
  jsonLd?: JsonLd[];
}) {
  const url = canonicalUrl(path);
  const imageUrl = canonicalUrl(image);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: ogType },
      { property: "og:url", content: url },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: imageUrl },
      { property: "og:locale", content: "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: jsonLd.map((data) => ({
      type: "application/ld+json",
      // Escape "<" so copy can never close the script tag.
      children: JSON.stringify(data).replace(/</g, "\\u003c"),
    })),
  };
}

const ORG_ID = `${SITE_ORIGIN}/#organization`;
const APP_ID = `${SITE_ORIGIN}/#app`;

export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: canonicalUrl("/icon-512.png"),
    description:
      "NutriAI builds an AI meal planner, calorie tracker and fitness coach for general wellness.",
    sameAs: ["https://github.com/Web864"],
  };
}

export function websiteSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
  };
}

export function softwareApplicationSchema({
  freePrice = "0",
  proPrice,
}: { freePrice?: string; proPrice?: string } = {}): JsonLd {
  const offers: JsonLd[] = [
    { "@type": "Offer", name: "Free", price: freePrice, priceCurrency: "USD" },
  ];
  if (proPrice) {
    offers.push({ "@type": "Offer", name: "Pro (monthly)", price: proPrice, priceCurrency: "USD" });
  }
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    applicationCategory: "HealthApplication",
    applicationSubCategory: "Nutrition and fitness",
    // Add "Android" once the Google Play listing is live.
    operatingSystem: "Web",
    description:
      "AI meal planner, photo and barcode calorie tracker, AI nutrition coach and workout planner for general wellness.",
    featureList: [
      "Personalized AI meal plans",
      "Photo and barcode food logging with calorie and macro estimates",
      "AI nutrition and fitness coach chat",
      "Adaptive home and gym workout plans",
      "Water, sleep, weight and mood tracking",
      "Support for South Asian foods such as roti, daal and biryani",
    ],
    offers,
    publisher: { "@id": ORG_ID },
  };
}

export function faqPageSchema(faqs: Faq[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function breadcrumbSchema(crumbs: Crumb[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

export function howToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
