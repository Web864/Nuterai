import { describe, expect, it } from "vitest";

import { FEATURES, GENERAL_FAQS, HOW_IT_WORKS_STEPS } from "@/content/marketing";
import { PRIVATE_PATH_PREFIXES, PUBLIC_PAGES } from "@/lib/public-pages";
import { faqPageSchema, pageHead } from "@/lib/seo";
import { SITE_ORIGIN } from "@/lib/site";

describe("public page list", () => {
  it("never puts a public page under a robots.txt-disallowed prefix", () => {
    for (const page of PUBLIC_PAGES) {
      for (const prefix of PRIVATE_PATH_PREFIXES) {
        expect(page.path.startsWith(prefix), `${page.path} is blocked by ${prefix}`).toBe(false);
      }
    }
  });

  it("lists every feature page exactly once", () => {
    const paths = PUBLIC_PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const feature of FEATURES) expect(paths).toContain(feature.path);
  });
});

describe("pageHead", () => {
  const head = pageHead({
    title: "Title",
    description: "Description",
    path: "/faq",
    jsonLd: [faqPageSchema(GENERAL_FAQS)],
  });

  it("emits an absolute canonical and matching og:url", () => {
    const canonical = head.links.find((l) => l.rel === "canonical")?.href;
    expect(canonical).toBe(`${SITE_ORIGIN}/faq`);
    expect(head.meta).toContainEqual({ property: "og:url", content: canonical });
  });

  it("uses absolute social images", () => {
    const image = head.meta.find((m) => "property" in m && m.property === "og:image");
    expect(image && "content" in image ? image.content : "").toMatch(/^https:\/\//);
  });

  it("serialises JSON-LD safely", () => {
    const [script] = head.scripts;
    expect(script.type).toBe("application/ld+json");
    expect(script.children).not.toContain("</");
    expect(JSON.parse(script.children)["@type"]).toBe("FAQPage");
  });
});

describe("marketing copy", () => {
  // General-wellness positioning: no medical claims in public copy or schema.
  const banned = /\b(cure[sd]?|treat(s|ment)?|diagnos(e|is)|clinically|guaranteed?|prescri)/i;
  const allowedContext = /(not|no|doesn't|does not|never|avoids)\b[^.]*\b(diagnos|treat)/i;

  const copy = [
    ...GENERAL_FAQS.flatMap((f) => [f.question, f.answer]),
    ...HOW_IT_WORKS_STEPS.map((s) => s.text),
    ...FEATURES.flatMap((f) => [
      f.title,
      f.description,
      f.h1,
      f.summary,
      ...f.bullets,
      ...f.sections.flatMap((s) => [s.heading, s.body]),
      ...f.faqs.flatMap((q) => [q.question, q.answer]),
    ]),
  ];

  it("makes no medical claims", () => {
    for (const text of copy) {
      if (banned.test(text)) expect(text, text).toMatch(allowedContext);
    }
  });

  it("keeps titles and descriptions within search snippet limits", () => {
    for (const f of FEATURES) {
      expect(f.title.length, f.title).toBeLessThanOrEqual(60);
      expect(f.description.length, f.description).toBeLessThanOrEqual(160);
      expect(f.description.length, f.description).toBeGreaterThanOrEqual(110);
    }
  });
});
