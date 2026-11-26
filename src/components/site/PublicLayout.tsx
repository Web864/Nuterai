import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Crumb, Faq } from "@/lib/seo";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Shell for every public, indexable page: skip link, header, main, footer. */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="landing-page premium-shell min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:outline-2 focus:outline-ring"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Visible breadcrumb trail; pair with breadcrumbSchema() in the route head. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link to={crumb.path} className="hover:text-foreground">
                    {crumb.name}
                  </Link>
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * FAQ list rendered with native <details>, so every answer is in the
 * server-rendered HTML (crawlers and AI answer engines can read it) while
 * still collapsing for people. Pair with faqPageSchema() using the same data.
 */
export function FaqList({
  faqs,
  headingLevel = "h3",
}: {
  faqs: Faq[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card/60">
      {faqs.map((faq) => (
        <details key={faq.question} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <Heading className="text-base font-semibold text-foreground">{faq.question}</Heading>
            <span
              aria-hidden="true"
              className="text-xl leading-none text-primary transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  summary,
  crumbs,
}: {
  eyebrow: string;
  title: ReactNode;
  summary: string;
  crumbs?: Crumb[];
}) {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        {crumbs && <Breadcrumbs crumbs={crumbs} />}
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-balance font-display text-4xl leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{summary}</p>
      </div>
    </section>
  );
}
